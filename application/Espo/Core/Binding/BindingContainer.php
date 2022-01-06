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

namespace Espo\Core\Binding;

use ReflectionClass;
use ReflectionParameter;
use LogicException;

class BindingContainer
{
    private $data;

    public function __construct(BindingData $data)
    {
        $this->data = $data;
    }

    public function has(?ReflectionClass $class, ReflectionParameter $param): bool
    {
        if ($this->getInternal($class, $param) === null) {
            return false;
        }

        return true;
    }

    public function get(?ReflectionClass $class, ReflectionParameter $param): Binding
    {
        if (!$this->has($class, $param)) {
            throw new LogicException("BindingContainer: Can't get not existing binding.");
        }

        return $this->getInternal($class, $param);
    }

    private function getInternal(?ReflectionClass $class, ReflectionParameter $param): ?Binding
    {
        $className = null;

        if ($class) {
            $className = $class->getName();

            $key = '$' . $param->getName();
        }

        if ($className && $this->data->hasContext($className, $key)) {
            return $this->data->getContext($className, $key);
        }

        $dependencyClassName = null;

        $type = $param->getType();

        if ($type && !$type->isBuiltin()) {
            $dependencyClassName = $type->getName();
        }

        $key = null;
        $keyWithParamName = null;

        if ($dependencyClassName) {
            $key = $dependencyClassName;

            if ($key) {
                $keyWithParamName = $key . ' $' . $param->getName();
            }
        }

        if ($keyWithParamName) {
            if ($className && $this->data->hasContext($className, $keyWithParamName)) {
                return $this->data->getContext($className, $keyWithParamName);
            }

            if ($this->data->hasGlobal($keyWithParamName)) {
                return $this->data->getGlobal($keyWithParamName);
            }
        }

        if ($key) {
            if ($className && $this->data->hasContext($className, $key)) {
                return $this->data->getContext($className, $key);
            }

            if ($this->data->hasGlobal($key)) {
                return $this->data->getGlobal($key);
            }
        }

        return null;
    }
}
