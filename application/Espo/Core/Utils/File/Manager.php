<?php
/************************************************************************
 * This file is part of EspoCRM.
 *
 * EspoCRM - Open Source CRM application.
 * Copyright (C) 2014-2021 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
 * Website: https://www.espocrm.com
 *
 * EspoCRM is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * EspoCRM is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EspoCRM. If not, see http://www.gnu.org/licenses/.
 *
 * The interactive user interfaces in modified source and object code versions
 * of this program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU General Public License version 3.
 *
 * In accordance with Section 7(b) of the GNU General Public License version 3,
 * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
 ************************************************************************/

namespace Espo\Core\Utils\File;

use Espo\Core\{
    Exceptions\Error,
    Utils\Util,
    Utils\Json,
};

use StdClass;
use Throwable;
use InvalidArgumentException;

use const E_USER_DEPRECATED;

class Manager
{
    private $permission;

    private $permissionDeniedList = [];

    protected $tmpDir = 'data/tmp';

    protected const RENAME_RETRY_NUMBER = 10;

    protected const RENAME_RETRY_INTERVAL = 0.1;

    protected const GET_SAFE_CONTENTS_RETRY_NUMBER = 10;

    protected const GET_SAFE_CONTENTS_RETRY_INTERVAL = 0.1;

    public function __construct(?array $defaultPermissions = null)
    {
        $params = null;

        if ($defaultPermissions) {
            $params = [
                'defaultPermissions' => $defaultPermissions,
            ];
        }

        $this->permission = new Permission($this, $params);
    }

    public function getPermissionUtils(): Permission
    {
        return $this->permission;
    }

    /**
     * Get a list of directories in a specified directory.
     * @return string[]
     */
    public function getDirList(string $path): array
    {
        return $this->getFileList($path, false, '', false);
    }

    /**
     * Get a list of files in a specified directory.
     *
     * @param string $path A folder path.
     * @param bool|int $recursively Find files in sub-folders.
     * @param string $filter Filter for files. Use regular expression, Example: `\.json$`.
     * @param bool|null $onlyFileType Filter for type of files/directories.
     * If TRUE - returns only file list, if FALSE - only directory list.
     * @param bool $returnSingleArray Return a single array.
     *
     * @return array<int, string>
     */
    public function getFileList(
        string $path,
        $recursively = false,
        $filter = '',
        $onlyFileType = null,
        bool $returnSingleArray = false
    ): array {

        $result = [];

        if (!file_exists($path) || !is_dir($path)) {
            return $result;
        }

        $cdir = scandir($path);

        foreach ($cdir as $key => $value) {
            if (!in_array($value, [".", ".."])) {
                $add = false;

                if (is_dir($path . Util::getSeparator() . $value)) {
                    if ($recursively || (is_int($recursively) && $recursively!=0)) {
                        $nextRecursively = is_int($recursively) ? ($recursively-1) : $recursively;

                        $result[$value] = $this->getFileList(
                            $path . Util::getSeparator() . $value,
                            $nextRecursively,
                            $filter,
                            $onlyFileType
                        );
                    }
                    else if (!isset($onlyFileType) || !$onlyFileType){ /*save only directories*/
                        $add = true;
                    }
                }
                else if (!isset($onlyFileType) || $onlyFileType) { /*save only files*/
                    $add = true;
                }

                if ($add) {
                    if (!empty($filter)) {
                        if (preg_match('/'.$filter.'/i', $value)) {
                            $result[] = $value;
                        }
                    }
                    else {
                        $result[] = $value;
                    }
                }

            }
        }

        if ($returnSingleArray) {
            return $this->getSingleFileList($result, $onlyFileType, $path);
        }

        return $result;
    }

    private function getSingleFileList(
        array $fileList,
        $onlyFileType = null,
        $basePath = null,
        $parentDirName = ''
    ): array {

        $singleFileList = [];

        foreach ($fileList as $dirName => $fileName) {
            if (is_array($fileName)) {
                $currentDir = Util::concatPath($parentDirName, $dirName);

                if (
                    !isset($onlyFileType) ||
                    $onlyFileType == $this->isFilenameIsFile($basePath . '/' . $currentDir)
                ) {
                    $singleFileList[] = $currentDir;
                }

                $singleFileList = array_merge(
                    $singleFileList, $this->getSingleFileList($fileName, $onlyFileType, $basePath, $currentDir)
                );
            }
            else {
                $currentFileName = Util::concatPath($parentDirName, $fileName);

                if (
                    !isset($onlyFileType) ||
                    $onlyFileType == $this->isFilenameIsFile($basePath . '/' . $currentFileName)
                ) {
                    $singleFileList[] = $currentFileName;
                }
            }
        }

        return $singleFileList;
    }

    /**
     * Get file contents.
     *
     * @param string
     *
     * @return string|false
     */
    public function getContents($path)
    {
        if (is_array($path)) {
            // For backward compatibility.
            // @todo Remove support of arrays in v6.4.
            trigger_error(
                'Array parameter is deprecated for FileMaanger::getContents.',
                E_USER_DEPRECATED
            );

            $path = $this->concatPaths($path);
        }
        else if (!is_string($path)) {
            throw new InvalidArgumentException();
        }

        if (file_exists($path)) {
            return file_get_contents($path);
        }

        return false;
    }

    /**
     * Get data from a PHP file.
     *
     * @return mixed|false
     */
    public function getPhpContents(string $path)
    {
        if (file_exists($path) && strtolower(substr($path, -4)) == '.php') {
            $phpContents = include($path);

            return $phpContents;
        }

        return false;
    }

    /**
     * Get array or StdClass data from PHP file.
     * If a file is not yet written, it will wait until it's ready.
     *
     * @return array|object
     */
    public function getPhpSafeContents(string $path)
    {
        if (!file_exists($path)) {
            throw new Error("Can't get contents from non-existing file '{$path}'.");
        }

        if (!strtolower(substr($path, -4)) == '.php') {
            throw new Error("Only PHP file are allowed for getting contents.");
        }

        $counter = 0;

        while ($counter < self::GET_SAFE_CONTENTS_RETRY_NUMBER) {
            $data = include($path);

            if (is_array($data) || $data instanceof StdClass) {
                return $data;
            }

            usleep(self::GET_SAFE_CONTENTS_RETRY_INTERVAL * 1000000);

            $counter ++;
        }

        throw new Error("Bad data stored in file '{$path}'.");
    }

    /**
     * Write contents to a file.
     *
     * @param mixed $data
     */
    public function putContents(string $path, $data, int $flags = 0, bool $useRenaming = false): bool
    {
        if ($this->checkCreateFile($path) === false) {
            throw new Error('Permission denied for '. $path);
        }

        $result = false;

        if ($useRenaming) {
            $result = $this->putContentsUseRenaming($path, $data);
        }

        if (!$result) {
            $result = (file_put_contents($path, $data, $flags) !== false);
        }

        if ($result) {
            $this->opcacheInvalidate($path);
        }

        return (bool) $result;
    }

    private function putContentsUseRenaming(string $path, $data): bool
    {
        $tmpDir = $this->tmpDir;

        if (!$this->isDir($tmpDir)) {
            $this->mkdir($tmpDir);
        }

        if (!$this->isDir($tmpDir)) {
            return false;
        }

        $tmpPath = tempnam($tmpDir, 'tmp');

        $tmpPath = $this->getRelativePath($tmpPath);

        if (!$tmpPath) {
            return false;
        }

        if (!$this->isFile($tmpPath)) {
            return false;
        }

        if (!$this->isWritable($tmpPath)) {
            return false;
        }

        $h = fopen($tmpPath, 'w');

        fwrite($h, $data);
        fclose($h);

        $this->getPermissionUtils()->setDefaultPermissions($tmpPath);

        if (!$this->isReadable($tmpPath)) {
            return false;
        }

        $result = rename($tmpPath, $path);

        if (!$result && stripos(\PHP_OS, 'WIN') === 0) {
            $result = $this->renameInLoop($tmpPath, $path);
        }

        if ($this->isFile($tmpPath)) {
            $this->removeFile($tmpPath);
        }

        return (bool) $result;
    }

    private function renameInLoop(string $source, string $destination): bool
    {
        $counter = 0;

        while ($counter < self::RENAME_RETRY_NUMBER) {
            if (!$this->isWritable($destination)) {
                break;
            }

            $result = rename($source, $destination);

            if ($result !== false) {
                return true;
            }

            usleep(self::RENAME_RETRY_INTERVAL * 1000000);

            $counter++;
        }

        return false;
    }

    /**
     * Save PHP contents to a file.
     *
     * @param mixed $data
     */
    public function putPhpContents(string $path, $data, bool $withObjects = false, bool $useRenaming = false): bool
    {
        return $this->putContents($path, $this->wrapForDataExport($data, $withObjects), LOCK_EX, $useRenaming);
    }

    /**
     * Save JSON content to a file.
     */
    public function putJsonContents(string $path, $data): bool
    {
        $options = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

        $contents = Json::encode($data, $options);

        return $this->putContents($path, $contents, LOCK_EX);
    }

    /**
     * Merge JSON file contents with existing and override the file.
     */
    public function mergeJsonContents(string $path, array $data): bool
    {
        $currentContents = $this->getContents($path);

        if ($this->isFile($path) && $currentContents === false) {
            throw new Error("FileManager: Failed to read file '{$path}'.");
        }

        $currentData = $this->isFile($path) ?
            Json::decode($currentContents, true) :
            [];

        if (!is_array($currentData)) {
            throw new Error("Neither an array nor object in '{$path}'.");
        }

        $mergedData = Util::merge($currentData, $data);

        $jsonOptions = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

        $stringData = Json::encode($mergedData, $jsonOptions);

        return (bool) $this->putContents($path, $stringData);
    }

    /**
     * Append contents to a file.
     *
     * @param string $data
     */
    public function appendContents(string $path, $data): bool
    {
        return $this->putContents($path, $data, FILE_APPEND | LOCK_EX);
    }

    /**
     * Unset specific items in a JSON file and override the file.
     * Items are specified as an array of JSON paths.
     */
    public function unsetJsonContents(string $path, array $unsets): bool
    {
        if (!file_exists($path)) {
            return true;
        }

        $currentContents = $this->getContents($path);

        if (!isset($currentContents) || !$currentContents) {
            return true;
        }

        $currentData = Json::decode($currentContents, true);

        $unsettedData = Util::unsetInArray($currentData, $unsets, true);

        if (
            is_null($unsettedData) ||
            (is_array($unsettedData) && empty($unsettedData))
        ) {
            return $this->unlink($path);
        }

        return (bool) $this->putJsonContents($path, $unsettedData);
    }

    /**
     * @deprecated
     */
    private function concatPaths($paths)
    {
        if (is_string($paths)) {
            return Util::fixPath($paths);
        }

        $fullPath = '';

        foreach ($paths as $path) {
            $fullPath = Util::concatPath($fullPath, $path);
        }

        return $fullPath;
    }

    /**
     * Create a new dir.
     *
     * @param string|array $path
     * @param int $permission Example: `0755`.
     */
    public function mkdir(string $path, $permission = null): bool
    {
        if (file_exists($path) && is_dir($path)) {
            return true;
        }

        $parentDirPath = dirname($path);

        if (!file_exists($parentDirPath)) {
            $this->mkdir($parentDirPath, $permission);
        }

        $defaultPermissions = $this->getPermissionUtils()->getRequiredPermissions($path);

        if (!isset($permission)) {
            $permission = base_convert((string) $defaultPermissions['dir'], 8, 10);
        }

        $umask = umask(0);

        $result = mkdir($path, $permission);

        if ($umask) {
            umask($umask);
        }

        if (!empty($defaultPermissions['user'])) {
            $this->getPermissionUtils()->chown($path);
        }

        if (!empty($defaultPermissions['group'])) {
            $this->getPermissionUtils()->chgrp($path);
        }

        return (bool) $result;
    }

    /**
     * Copy files from one directory to another.
     * Example: $sourcePath = 'data/uploads/extensions/file.json',
     * $destPath = 'data/uploads/backup', result will be data/uploads/backup/data/uploads/backup/file.json.
     *
     * @param string $sourcePath
     * @param string $destPath
     * @param bool $recursively
     * @param array $fileList List of files that should be copied.
     * @param bool $copyOnlyFiles Copy only files, instead of full path with directories.
     * Example:
     * $sourcePath = 'data/uploads/extensions/file.json',
     * $destPath = 'data/uploads/backup', result will be 'data/uploads/backup/file.json'.
     */
    public function copy(
        string $sourcePath,
        string $destPath,
        bool $recursively = false,
        array $fileList = null,
        bool $copyOnlyFiles = false
    ): bool {

        if (!isset($fileList)) {
            $fileList = is_file($sourcePath) ?
                (array) $sourcePath :
                $this->getFileList($sourcePath, $recursively, '', true, true);
        }

        $permissionDeniedList = [];

        foreach ($fileList as $file) {
            if ($copyOnlyFiles) {
                $file = pathinfo($file, PATHINFO_BASENAME);
            }

            $destFile = Util::concatPath($destPath, $file);

            $isFileExists = file_exists($destFile);

            if ($this->checkCreateFile($destFile) === false) {
                $permissionDeniedList[] = $destFile;
            }
            else if (!$isFileExists) {
                $this->removeFile($destFile);
            }
        }

        if (!empty($permissionDeniedList)) {
            $betterPermissionList = $this->getPermissionUtils()->arrangePermissionList($permissionDeniedList);

            throw new Error("Permission denied for <br>". implode(", <br>", $betterPermissionList));
        }

        $res = true;

        foreach ($fileList as $file) {
            if ($copyOnlyFiles) {
                $file = pathinfo($file, PATHINFO_BASENAME);
            }

            $sourceFile = is_file($sourcePath) ?
                $sourcePath :
                Util::concatPath($sourcePath, $file);

            $destFile = Util::concatPath($destPath, $file);

            if (file_exists($sourceFile) && is_file($sourceFile)) {
                $res &= copy($sourceFile, $destFile);

                $this->getPermissionUtils()->setDefaultPermissions($destFile);

                $this->opcacheInvalidate($destFile);
            }
        }

        return (bool) $res;
    }

    /**
     * Checks whether a new file can be created. It will also create all needed directories.
     */
    public function checkCreateFile(string $filePath): bool
    {
        $defaultPermissions = $this->getPermissionUtils()->getRequiredPermissions($filePath);

        if (file_exists($filePath)) {
            if (
                !is_writable($filePath) &&
                !in_array(
                    $this->getPermissionUtils()->getCurrentPermission($filePath),
                    [$defaultPermissions['file'], $defaultPermissions['dir']]
                )
            ) {
                return $this->getPermissionUtils()->setDefaultPermissions($filePath);
            }

            return true;
        }

        $pathParts = pathinfo($filePath);

        if (!file_exists($pathParts['dirname'])) {
            $dirPermissionOriginal = $defaultPermissions['dir'];

            $dirPermission = is_string($dirPermissionOriginal) ?
                base_convert($dirPermissionOriginal, 8, 10) :
                $dirPermissionOriginal;

            if (!$this->mkdir($pathParts['dirname'], $dirPermission, true)) {
                throw new Error(
                    'Permission denied: unable to create a folder on the server ' . $pathParts['dirname']
                );
            }
        }

        $touchResult = touch($filePath);

        if (!$touchResult) {
            return false;
        }

        $setPrermissionsResult = $this->getPermissionUtils()->setDefaultPermissions($filePath);

        if (!$setPrermissionsResult) {
            $this->unlink($filePath);

            /**
             * Returning true will cause situations when files are created with
             * a wrong ownership. This is a trade-off for being able to run
             * Espo under a user that is neither webserver-user nor root. A file
             * will be created owned by a user running the process.
             */
            return true;
        }

        return true;
    }

    /**
     * Remove a file or multiples files.
     *
     * @param array|string $filePaths File paths or a single path.
     */
    public function unlink($filePaths): bool
    {
        return $this->removeFile($filePaths);
    }

    /**
     * @deprecated Use removeDir.
     */
    public function rmdir($dirPaths): bool
    {
        if (!is_array($dirPaths)) {
            $dirPaths = (array) $dirPaths;
        }

        $result = true;

        foreach ($dirPaths as $dirPath) {
            if (is_dir($dirPath) && is_writable($dirPath)) {
                $result &= rmdir($dirPath);
            }
        }

        return (bool) $result;
    }

    /**
     * Remove a directory or multiple directories.
     *
     * @param array|string $dirPaths
     */
    public function removeDir($dirPaths): bool
    {
        return $this->rmdir($dirPaths);
    }

    /**
     * Remove file or multiples files.
     *
     * @param array|string $filePaths File paths or a single path.
     * @param string|null $dirPath A directory path.
     */
    public function removeFile($filePaths, $dirPath = null): bool
    {
        if (!is_array($filePaths)) {
            $filePaths = (array) $filePaths;
        }

        $result = true;

        foreach ($filePaths as $filePath) {
            if (isset($dirPath)) {
                $filePath = Util::concatPath($dirPath, $filePath);
            }

            if (file_exists($filePath) && is_file($filePath)) {
                $this->opcacheInvalidate($filePath, true);

                $result &= unlink($filePath);
            }
        }

        return (bool) $result;
    }

    /**
     * Remove all files inside a given directory.
     */
    public function removeInDir(string $path, bool $removeWithDir = false): bool
    {
        $fileList = $this->getFileList($path, false);

        $result = true;

        if (is_array($fileList)) {
            foreach ($fileList as $file) {
                $fullPath = Util::concatPath($path, $file);

                if (is_dir($fullPath)) {
                    $result &= $this->removeInDir($fullPath, true);
                }
                else if (file_exists($fullPath)) {
                    $result &= unlink($fullPath);
                }
            }
        }

        if ($removeWithDir && $this->isDirEmpty($path)) {
            $result &= $this->rmdir($path);
        }

        return (bool) $result;
    }

    /**
     * Remove items (files or directories).
     *
     * @param string|array $items
     * @param string $dirPath
     */
    public function remove($items, $dirPath = null, bool $removeEmptyDirs = false): bool
    {
        if (!is_array($items)) {
            $items = (array) $items;
        }

        $removeList = [];
        $permissionDeniedList = [];

        foreach ($items as $item) {
            if (isset($dirPath)) {
                $item = Util::concatPath($dirPath, $item);
            }

            if (!file_exists($item)) {
                continue;
            }

            $removeList[] = $item;

            if (!is_writable($item)) {
                $permissionDeniedList[] = $item;
            }
            else if (!is_writable(dirname($item))) {
                $permissionDeniedList[] = dirname($item);
            }
        }

        if (!empty($permissionDeniedList)) {
            $betterPermissionList = $this->getPermissionUtils()->arrangePermissionList($permissionDeniedList);

            throw new Error("Permission denied for <br>". implode(", <br>", $betterPermissionList));
        }

        $result = true;

        foreach ($removeList as $item) {
            if (is_dir($item)) {
                $result &= $this->removeInDir($item, true);
            }
            else {
                $result &= $this->removeFile($item);
            }

            if ($removeEmptyDirs) {
                $result &= $this->removeEmptyDirs($item);
            }
        }

        return (bool) $result;
    }

    /**
     * Remove empty parent directories if they are empty.
     */
    private function removeEmptyDirs(string $path): bool
    {
        $parentDirName = $this->getParentDirName($path);

        $res = true;

        if ($this->isDirEmpty($parentDirName)) {
            $res &= $this->rmdir($parentDirName);
            $res &= $this->removeEmptyDirs($parentDirName);
        }

        return (bool) $res;
    }

    /**
     * Check whether a path is a directory.
     */
    public function isDir(string $dirPath): bool
    {
        return is_dir($dirPath);
    }

    /**
     * Check whether a file.
     */
    public function isFile(string $path): bool
    {
        return is_file($path);
    }

    /**
     * Check whether a file or directory exists.
     */
    public function exists(string $path): bool
    {
        return file_exists($path);
    }

    /**
     * Check whether a file. If doesn't exist, check by path info.
     */
    private function isFilenameIsFile(string $path): bool
    {
        if (file_exists($path)) {
            return is_file($path);
        }

        $fileExtension = pathinfo($path, PATHINFO_EXTENSION);

        if (!empty($fileExtension)) {
            return true;
        }

        return false;
    }

    /**
     * Check whether a directory is empty.
     */
    public function isDirEmpty(string $path): bool
    {
        if (is_dir($path)) {
            $fileList = $this->getFileList($path, true);

            if (is_array($fileList) && empty($fileList)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get a filename without a file extension.
     *
     * @param string $fileName
     * @param string $extension Extension, example: `.json`.
     */
    public function getFileName(string $fileName, string $extension = ''): string
    {
        if (empty($extension)) {
            $fileName = substr($fileName, 0, strrpos($fileName, '.', -1));
        }
        else {
            if (substr($extension, 0, 1) != '.') {
                $extension = '.' . $extension;
            }

            if (substr($fileName, -(strlen($extension))) == $extension) {
                $fileName = substr($fileName, 0, -(strlen($extension)));
            }
        }

        $array = explode('/', Util::toFormat($fileName, '/'));

        return end($array);
    }

    /**
     * Get a directory name from the path.
     */
    public function getDirName(string $path, bool $isFullPath = true, bool $useIsDir = true): string
    {
        $dirName = preg_replace('/\/$/i', '', $path);

        $dirName = ($useIsDir && is_dir($dirName)) ?
            $dirName :
            pathinfo($dirName, PATHINFO_DIRNAME);

        if (!$isFullPath) {
            $pieces = explode('/', $dirName);
            $dirName = $pieces[count($pieces)-1];
        }

        return $dirName;
    }

    /**
     * Get parent dir name/path.
     *
     * @param string $path
     * @param boolean $isFullPath
     * @return string
     */
    public function getParentDirName(string $path, bool $isFullPath = true): string
    {
        return $this->getDirName($path, $isFullPath, false);
    }

    /**
     * Wrap data for export to PHP file.
     *
     * @param array|object $data
     * @return string|false
     */
    public function wrapForDataExport($data, bool $withObjects = false)
    {
        if (!isset($data)) {
            return false;
        }

        if (!$withObjects) {
            return "<?php\n" .
                "return " . var_export($data, true) . ";\n";
        }

        return "<?php\n" .
            "return " . $this->varExport($data) . ";\n";
    }

    private function varExport($variable, int $level = 0)
    {
        $tab = '';
        $tabElement = '  ';

        for ($i = 0; $i <= $level; $i++) {
            $tab .= $tabElement;
        }

        $prevTab = substr($tab, 0, strlen($tab) - strlen($tabElement));

        if ($variable instanceof StdClass) {
            return "(object) " . $this->varExport(get_object_vars($variable), $level);
        }

        if (is_array($variable)) {
            $array = [];

            foreach ($variable as $key => $value) {
                $array[] = var_export($key, true) . " => " . $this->varExport($value, $level + 1);
            }

            if (count($array) === 0) {
                return "[]";
            }

            return "[\n" . $tab . implode(",\n" . $tab, $array) . "\n" . $prevTab . "]";
        }

        return var_export($variable, true);
    }

    /**
     * Check if $paths are writable. Permission denied list can be ontained
     * with getLastPermissionDeniedList().
     */
    public function isWritableList(array $paths): bool
    {
        $permissionDeniedList = [];

        $result = true;

        foreach ($paths as $path) {
            $rowResult = $this->isWritable($path);

            if (!$rowResult) {
                $permissionDeniedList[] = $path;
            }

            $result &= $rowResult;
        }

        if (!empty($permissionDeniedList)) {
            $this->permissionDeniedList =
                $this->getPermissionUtils()->arrangePermissionList($permissionDeniedList);
        }

        return (bool) $result;
    }

    /**
     * Get last permission denied list.
     *
     * @return array
     */
    public function getLastPermissionDeniedList(): array
    {
        return $this->permissionDeniedList;
    }

    /**
     * Check if $path is writable.
     */
    public function isWritable(string $path): bool
    {
        $existFile = $this->getExistsPath($path);

        return is_writable($existFile);
    }

    /**
     * Check if $path is writable.
     */
    public function isReadable(string $path): bool
    {
        $existFile = $this->getExistsPath($path);

        return is_readable($existFile);
    }

    /**
     * Get exists path.
     * Example: If `/var/www/espocrm/custom/someFile.php` file doesn't exist,
     * result will be `/var/www/espocrm/custom`.
     */
    private function getExistsPath(string $path): string
    {
        if (!file_exists($path)) {
            return $this->getExistsPath(pathinfo($path, PATHINFO_DIRNAME));
        }

        return $path;
    }

    /**
     * @deprecated
     * @todo Make private or move to `File\Util`.
     */
    public function getRelativePath(string $path, ?string $basePath = null, ?string $dirSeparator = null): string
    {
        if (!$basePath) {
            $basePath = getcwd();
        }

        $path = Util::fixPath($path);
        $basePath = Util::fixPath($basePath);

        if (!$dirSeparator) {
            $dirSeparator = Util::getSeparator();
        }

        if (substr($basePath, -1) != $dirSeparator) {
            $basePath .= $dirSeparator;
        }

        return preg_replace('/^'. preg_quote($basePath, $dirSeparator) . '/', '', $path);
    }

    private function opcacheInvalidate(string $filepath, bool $force = false): void
    {
        if (!function_exists('opcache_invalidate')) {
            return;
        }

        try {
            opcache_invalidate($filepath, $force);
        }
        catch (Throwable $e) {}
    }
}
