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

namespace Espo\Entities;

use Espo\Core\ORM\Entity;
use Espo\Core\Field\DateTime;
use Espo\Core\Field\Link;

use Espo\Core\Select\SearchParams;
use Espo\Core\MassAction\Data;

use stdClass;

class MassAction extends Entity
{
    public const ENTITY_TYPE = 'MassAction';

    public const STATUS_PENDING = 'Pending';

    public const STATUS_RUNNING = 'Running';

    public const STATUS_SUCCESS = 'Success';

    public const STATUS_FAILED = 'Failed';

    public function getSearchParams(): SearchParams
    {
        $raw = $this->get('searchParams');

        assert($raw instanceof stdClass);

        return SearchParams::fromRaw($raw);
    }

    public function getData(): Data
    {
        $raw = $this->get('data');

        assert($raw instanceof stdClass);

        return Data::fromRaw($raw);
    }

    public function getEntityType(): string
    {
        $value = $this->get('entityType');

        assert(is_string($value));

        return $value;
    }

    public function getAction(): string
    {
        $value = $this->get('action');

        assert(is_string($value));

        return $value;
    }

    public function getStatus(): string
    {
        $value = $this->get('status');

        assert(is_string($value));

        return $value;
    }

    public function getTotalCount(): ?int
    {
        return $this->get('totalCount');
    }

    public function notifyOnFinish(): bool
    {
        return (bool) $this->get('notifyOnFinish');
    }

    public function getCreatedAt(): DateTime
    {
        $value = $this->getValueObject('createdAt');

        assert($value instanceof DateTime);

        return $value;
    }

    public function getCreatedBy(): Link
    {
        $value = $this->getValueObject('createdBy');

        assert($value instanceof Link);

        return $value;
    }

    public function setStatus(string $status): void
    {
        $this->set('status', $status);
    }
}
