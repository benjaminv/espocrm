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

define('crm:views/task/modals/detail', 'views/modals/detail', function (Dep) {

    return Dep.extend({

        setupRecordButtons: function () {
            this.addDropdownItem({
                name: 'setCompleted',
                label: 'Complete',
            }, true);


            Dep.prototype.setupRecordButtons.call(this);
        },

        controlRecordButtonsVisibility: function () {
            if (
                !~['Completed', 'Canceled'].indexOf(this.model.get('status'))
                &&
                this.getAcl().check(this.model, 'edit')
            ) {
                this.showActionItem('setCompleted');
            } else {
                this.hideActionItem('setCompleted');
            }

            Dep.prototype.controlRecordButtonsVisibility.call(this);
        },

        actionSetCompleted: function () {
            this.model.save({
                status: 'Completed'
            }, {
                patch: true,
                success: function () {
                    this.hideActionItem('setCompleted');
                    Espo.Ui.success(this.getLanguage().translateOption('Completed', 'status', 'Task'));
                    this.trigger('after:save', this.model);
                }.bind(this),
            });
        }
    });
});
