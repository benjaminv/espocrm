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
use Espo\Core\Sms\Sms as SmsInterface;
use Espo\Core\Field\DateTime;

use Espo\Repositories\Sms as SmsRepository;

class Sms extends Entity implements SmsInterface
{
    public const ENTITY_TYPE = 'Sms';

    public const STATUS_ARCHIVED = 'Archived';

    public const STATUS_SENT = 'Sent';

    public const STATUS_SENDING = 'Sending';

    public const STATUS_DRAFT = 'Draft';

    public function getDateSent(): ?DateTime
    {
        return $this->getValueObject('dateTime');
    }

    public function getCreatedAt(): ?DateTime
    {
        return $this->getValueObject('createdAt');
    }

    public function getBody(): string
    {
        return $this->get('body') ?? '';
    }

    public function getStatus(): ?string
    {
        return $this->get('status');
    }

    public function setBody(?string $body): self
    {
        $this->set('body', $body);

        return $this;
    }

    public function setFromNumber(?string $number): self
    {
        $this->set('from', $number);

        return $this;
    }

    public function addToNumber(string $number): self
    {
        $list = $this->getToNumberList();

        $list[] = $number;

        $this->set('to', implode(';', $list));

        return $this;
    }

    public function getFromNumber(): ?string
    {
        if (!$this->hasInContainer('from') && !$this->isNew()) {
            $this->getSmsRepository()->loadFromField($this);
        }

        return $this->get('from');
    }

    public function getFromName(): ?string
    {
        return $this->get('fromName');
    }

    /**
     * @return string[]
     */
    public function getToNumberList(): array
    {
        if (!$this->hasInContainer('to') && !$this->isNew()) {
            $this->getSmsRepository()->loadToField($this);
        }

        $value = $this->get('to');

        if (!$value) {
            return [];
        }

        return explode(';', $value);
    }

    public function setAsSent(): self
    {
        $this->set('status', self::STATUS_SENT);

        if (!$this->get('dateSent')) {
            $this->set('dateSent', DateTime::createNow()->getString());
        }

        return $this;
    }

    private function getSmsRepository(): SmsRepository
    {
        /** @var SmsRepository */
        return $this->entityManager->getRepository(self::ENTITY_TYPE);
    }
}
