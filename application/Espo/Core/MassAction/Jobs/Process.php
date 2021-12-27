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

namespace Espo\Core\MassAction\Jobs;

use Espo\Core\Exceptions\Error;
use Espo\Core\Job\Job;
use Espo\Core\Job\Job\Data as JobData;
use Espo\Core\MassAction\Params;
use Espo\Core\MassAction\MassActionFactory;

use Espo\ORM\EntityManager;

use Espo\Entities\MassAction as MassActionEntity;
use Espo\Entities\Notification;

use Espo\Core\Utils\Language;

class Process implements Job
{
    private $entityManager;

    private $factory;

    private $language;

    public function __construct(EntityManager $entityManager, MassActionFactory $factory, Language $language)
    {
        $this->entityManager = $entityManager;
        $this->factory = $factory;
        $this->language = $language;
    }

    public function run(JobData $data): void
    {
        $id = $data->getTargetId();

        assert($id !== null);

        /** @var MassActionEntity|null $entity */
        $entity = $this->entityManager->getEntity(MassActionEntity::ENTITY_TYPE, $id);

        if ($entity === null) {
            throw new Error("MassAction '{$id}' not found.");
        }

        $massAction = $this->factory->create($entity->getAction());

        $params = Params::createWithSearchParams(
            $entity->getEntityType(),
            $entity->getSearchParams()
        );

        $massAction->process(
            $params,
            $entity->getData()
        );

        $this->entityManager->refreshEntity($entity);

        if ($entity->notifyOnFinish()) {
            $this->notifyFinish($entity);
        }
    }

    private function notifyFinish(MassActionEntity $entity): void
    {
        /** @var Notification $notification */
        $notification = $this->entityManager->getNewEntity(Notification::ENTITY_TYPE);

        $message = $this->language->translate('massActionProcessed', 'message');

        $notification
            ->setMessage($message)
            ->setUserId($entity->getCreatedBy()->getId());

        $this->entityManager->saveEntity($notification);
    }
}
