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

define('views/record/list', 'view', function (Dep) {

    return Dep.extend({

        template: 'record/list',

        /**
         * Type of the list. Can be 'list', 'listSmall'.
         */
        type: 'list',

        name: 'list',

        presentationType: 'table',

        /**
         * If true checkboxes will be shown.
         */
        checkboxes: true,

        /**
         * If true clicking on the record link will trigger 'select' event with model passed.
         */
        selectable: false,

        rowActionsView: 'views/record/row-actions/default',

        rowActionsDisabled: false,

        /**
         * Set automatically.
         */
        entityType: null,

        /**
         * Set automatically.
         */
        scope: null,

        _internalLayoutType: 'list-row',

        listContainerEl: '.list > table > tbody',

        showCount: true,

        rowActionsColumnWidth: 25,

        checkboxColumnWidth: 40,

        buttonList: [],

        headerDisabled: false,

        massActionsDisabled: false,

        portalLayoutDisabled: false,

        dropdownItemList: [],

        minColumnWidth: 100,

        mandatorySelectAttributeList: null,

        /**
         * A layout name. If null, a value from `type` property will be used.
         */
        layoutName: null,

        /**
         * A scope name for layout loading. If null, an entity type of collection will be used.
         */
        layoutScope: null,

        /**
         * To disable field-level access check for a layout.
         */
        layoutAclDisabled: false,

        setupHandlerType: 'record/list',

        checkboxesDisabled: false,

        events: {
            'click a.link': function (e) {
                e.stopPropagation();

                if (!this.scope || this.selectable) {
                    return;
                }

                e.preventDefault();

                var id = $(e.currentTarget).attr('data-id');

                var model = this.collection.get(id);

                var scope = this.getModelScope(id);

                var options = {
                    id: id,
                    model: model,
                };

                if (this.options.keepCurrentRootUrl) {
                    options.rootUrl = this.getRouter().getCurrentUrl();
                }

                this.getRouter().navigate('#' + scope + '/view/' + id, {trigger: false});

                this.getRouter().dispatch(scope, 'view', options);
            },

            'click [data-action="showMore"]': function () {
                this.showMoreRecords();
            },

            'click a.sort': function (e) {
                var field = $(e.currentTarget).data('name');

                this.toggleSort(field);
            },

            'click .pagination a': function (e) {
                var page = $(e.currentTarget).data('page');

                if ($(e.currentTarget).parent().hasClass('disabled')) {
                    return;
                }

                Espo.Ui.notify(this.translate('loading', 'messages'));

                this.collection.once('sync', () => {
                    this.notify(false);
                });

                if (page === 'current') {
                    this.collection.fetch();
                }
                else {
                    this.collection[page + 'Page'].call(this.collection);
                    this.trigger('paginate');
                }

                this.deactivate();
            },

            'click .record-checkbox': function (e) {
                var $target = $(e.currentTarget);

                var id = $target.attr('data-id');

                if (e.currentTarget.checked) {
                    this.checkRecord(id, $target);
                } else {
                    this.uncheckRecord(id, $target);
                }
            },

            'click .select-all': function (e) {
                this.selectAllHandler(e.currentTarget.checked);
            },

            'click .action': function (e) {
                Espo.Utils.handleAction(this, e);
            },

            'click .checkbox-dropdown [data-action="selectAllResult"]': function (e) {
                this.selectAllResult();
            },

            'click .actions-menu a.mass-action': function (e) {
                $el = $(e.currentTarget);

                var action = $el.data('action');

                var method = 'massAction' + Espo.Utils.upperCaseFirst(action);

                if (method in this) {
                    this[method]();
                } else {
                    this.massAction(action);
                }
            }
        },

        toggleSort: function (orderBy) {
            var asc = true;
            if (orderBy === this.collection.orderBy && this.collection.order === 'asc') {
                asc = false;
            }

            var order = asc ? 'asc' : 'desc';

            Espo.Ui.notify(this.translate('loading', 'messages'));

            this.collection.once('sync', () => {
                this.notify(false);

                this.trigger('sort', {orderBy: orderBy, order: order});
            });

            var maxSizeLimit = this.getConfig().get('recordListMaxSizeLimit') || 200;

            while (this.collection.length > maxSizeLimit) {
                this.collection.pop();
            }

            this.collection.sort(orderBy, order);

            this.collection.trigger('order-changed');

            this.deactivate();
        },

        initStickedBar: function () {
            var $stickedBar = this.$stickedBar = this.$el.find('.sticked-bar');
            var $middle = this.$el.find('> .list');
            var $window = $(window);
            var $scrollable = $window;

            this.on('render', () => {
                this.$stickedBar = null;
            });

            var screenWidthXs = this.getThemeManager().getParam('screenWidthXs');

            function getOffsetTop (element) {
                var offsetTop = 0;

                do {
                    if (element.classList.contains('modal-body')) {
                        break;
                    }

                    if (!isNaN(element.offsetTop)) {
                        offsetTop += element.offsetTop;
                    }
                } while (element = element.offsetParent);

                return offsetTop;
            }

            var top;

            if (this.$el.closest('.modal-body').length) {
                $scrollable = this.$el.closest('.modal-body');

                top = 0;
            }
            else {
                top = getOffsetTop(this.getParentView().$el.get(0));

                if ($(window.document).width() < screenWidthXs) {
                    top = 0;
                }
            }

            top += this.$el.find('.list-buttons-container').height();


            $scrollable.off('scroll.list-' + this.cid);

            $scrollable.on('scroll.list-' + this.cid, (e) => {
                controlSticking();
            });

            $window.off('resize.list-' + this.cid);

            $window.on('resize.list-' + this.cid, (e) => {
                controlSticking();
            });

            this.on('check', () => {
                if (this.checkedList.length === 0 && !this.allResultIsChecked) {
                    return;
                }

                controlSticking();
            });

            this.once('remove', () => {
                $scrollable.off('scroll.list-' + this.cid);

                $window.off('resize.list-' + this.cid);
            });

            var controlSticking = () => {
                if (this.checkedList.length === 0 && !this.allResultIsChecked) {
                    return;
                }

                var middleTop = getOffsetTop($middle.get(0));

                var stickTop = middleTop - top;

                var edge = middleTop + $middle.outerHeight(true);

                var scrollTop = $scrollable.scrollTop();

                if (scrollTop < edge) {
                    if (scrollTop > stickTop) {
                        $stickedBar.removeClass('hidden');
                    }
                    else {
                        $stickedBar.addClass('hidden');
                    }
                }
                else {
                    $stickedBar.removeClass('hidden');
                }
            };
        },

        showActions: function () {
            this.$el.find('.actions-button').removeClass('hidden');

            if (!this.options.stickedBarDisabled && !this.stickedBarDisabled && this.massActionList.length) {
                if (!this.$stickedBar) {
                    this.initStickedBar();
                }
            }
        },

        hideActions: function () {
            this.$el.find('.actions-button').addClass('hidden');

            if (this.$stickedBar) {
                this.$stickedBar.addClass('hidden');
            }
        },

        selectAllHandler: function (isChecked) {
            this.checkedList = [];

            if (isChecked) {
                this.$el.find('input.record-checkbox').prop('checked', true);

                this.showActions();

                this.collection.models.forEach((model) => {
                    this.checkedList.push(model.id);
                });

                this.$el.find('.list > table tbody tr').addClass('active');
            }
            else {
                if (this.allResultIsChecked) {
                    this.unselectAllResult();
                }

                this.$el.find('input.record-checkbox').prop('checked', false);

                this.hideActions();

                this.$el.find('.list > table tbody tr').removeClass('active');
            }

            this.trigger('check');
        },

        /**
         * @param {string} or {bool} ['both', 'top', 'bottom', false, true] Where to display paginations.
         */
        pagination: false,

        /**
         * @param {bool} To dispaly table header with column names.
         */
        header: true,

        showMore: true,

        massActionList: ['remove', 'merge', 'massUpdate', 'export'],

        checkAllResultMassActionList: ['remove', 'massUpdate', 'export'],

        quickDetailDisabled: false,

        quickEditDisabled: false,

        listLayout: null,

        _internalLayout: null,

        checkedList: null,

        checkAllResultDisabled: false,

        buttonsDisabled: false,

        allResultIsChecked: false,

        data: function () {
            var paginationTop = this.pagination === 'both' ||
                this.pagination === 'top';

            var paginationBottom = this.pagination === 'both' ||
                this.pagination === true ||
                this.pagination === 'bottom';

            var moreCount = this.collection.total - this.collection.length;

            var checkAllResultDisabled = this.checkAllResultDisabled;

            if (!this.massActionsDisabled) {
                if (!this.checkAllResultMassActionList.length) {
                    checkAllResultDisabled = true;
                }
            }

            var topBar =
                paginationTop ||
                this.checkboxes ||
                (this.buttonList.length && !this.buttonsDisabled) ||
                (this.dropdownItemList.length && !this.buttonsDisabled) ||
                this.forceDisplayTopBar;

            return {
                scope: this.scope,
                entityType: this.entityType,
                header: this.header,
                headerDefs: this._getHeaderDefs(),
                paginationEnabled: this.pagination,
                paginationTop: paginationTop,
                paginationBottom: paginationBottom,
                showMoreActive: this.collection.total > this.collection.length || this.collection.total === -1,
                showMoreEnabled: this.showMore,
                showCount: this.showCount && this.collection.total > 0,
                moreCount: moreCount,
                checkboxes: this.checkboxes,
                massActionList: this.massActionList,
                rowList: this.rowList,
                topBar: topBar,
                bottomBar: paginationBottom,
                checkAllResultDisabled: checkAllResultDisabled,
                buttonList: this.buttonList,
                dropdownItemList: this.dropdownItemList,
                displayTotalCount: this.displayTotalCount && this.collection.total > 0,
                displayActionsButtonGroup: this.checkboxes ||
                    this.massActionList || this.buttonList.length || this.dropdownItemList.length,
                totalCountFormatted: this.getNumberUtil().formatInt(this.collection.total),
                moreCountFormatted: this.getNumberUtil().formatInt(moreCount),
                checkboxColumnWidth: this.checkboxColumnWidth,
            };
        },

        init: function () {
            this.listLayout = this.options.listLayout || this.listLayout;

            this.type = this.options.type || this.type;

            this.layoutName = this.options.layoutName || this.layoutName || this.type;
            this.layoutScope = this.options.layoutScope || this.layoutScope;
            this.layoutAclDisabled = this.options.layoutAclDisabled || this.layoutAclDisabled;

            this.headerDisabled = this.options.headerDisabled || this.headerDisabled;

            if (!this.headerDisabled) {
                this.header = _.isUndefined(this.options.header) ? this.header : this.options.header;
            } else {
                this.header = false;
            }

            this.pagination = _.isUndefined(this.options.pagination) || this.options.pagination === null ?
                this.pagination :
                this.options.pagination;

            this.checkboxes = _.isUndefined(this.options.checkboxes) ? this.checkboxes : this.options.checkboxes;
            this.selectable = _.isUndefined(this.options.selectable) ? this.selectable : this.options.selectable;

            this.checkboxesDisabled = this.options.checkboxes === false;

            this.rowActionsView = _.isUndefined(this.options.rowActionsView) ?
                this.rowActionsView :
                this.options.rowActionsView;

            this.showMore = _.isUndefined(this.options.showMore) ? this.showMore : this.options.showMore;

            this.massActionsDisabled = this.options.massActionsDisabled || this.massActionsDisabled;
            this.portalLayoutDisabled = this.options.portalLayoutDisabled || this.portalLayoutDisabled;

            if (this.massActionsDisabled && !this.selectable) {
                this.checkboxes = false;
            }

            this.rowActionsDisabled = this.options.rowActionsDisabled || this.rowActionsDisabled;

            this.dropdownItemList = Espo.Utils.cloneDeep(this.options.dropdownItemList || this.dropdownItemList);

            if ('buttonsDisabled' in this.options) {
                this.buttonsDisabled = this.options.buttonsDisabled;
            }

            if ('checkAllResultDisabled' in this.options) {
                this.checkAllResultDisabled = this.options.checkAllResultDisabled;
            }
        },

        getModelScope: function (id) {
            return this.scope;
        },

        selectAllResult: function () {
            this.allResultIsChecked = true;

            this.hideActions();

            this.$el.find('input.record-checkbox').prop('checked', true).attr('disabled', 'disabled');
            this.$el.find('input.select-all').prop('checked', true);

            this.massActionList.forEach(item => {
                if (!~this.checkAllResultMassActionList.indexOf(item)) {
                    this.$el
                        .find(
                            'div.list-buttons-container .actions-menu li a.mass-action[data-action="'+item+'"]'
                        )
                        .parent()
                        .addClass('hidden');
                }
            });

            if (this.checkAllResultMassActionList.length) {
                this.showActions();
            }

            this.$el.find('.list > table tbody tr').removeClass('active');

            this.trigger('select-all-results');
        },

        unselectAllResult: function () {
            this.allResultIsChecked = false;

            this.$el.find('input.record-checkbox').prop('checked', false).removeAttr('disabled');
            this.$el.find('input.select-all').prop('checked', false);

            this.massActionList.forEach(function(item) {
                if (!~this.checkAllResultMassActionList.indexOf(item)) {
                    this.$el
                        .find(
                            'div.list-buttons-container .actions-menu li a.mass-action[data-action="'+item+'"]'
                        )
                        .parent()
                        .removeClass('hidden');
                }
            }, this);
        },

        deactivate: function () {
            if (this.$el) {
                this.$el.find(".pagination li").addClass('disabled');
                this.$el.find("a.sort").addClass('disabled');
            }
        },

        export: function (data, url, fieldList) {
            if (!data) {
                data = {
                    entityType: this.entityType,
                };

                if (this.allResultIsChecked) {
                    data.where = this.collection.getWhere();
                    data.searchParams = this.collection.data || {};
                    data.searchData = this.collection.data || {}; // for bc;
                }
                else {
                    data.ids = this.checkedList;
                }
            }

            var url = url || 'Export';

            var o = {
                scope: this.entityType
            };

            if (fieldList) {
                o.fieldList = fieldList;
            }
            else {
                var layoutFieldList = [];

                (this.listLayout || []).forEach((item) => {
                    if (item.name) {
                        layoutFieldList.push(item.name);
                    }
                });

                o.fieldList = layoutFieldList;
            }

            this.createView('dialogExport', 'views/export/modals/export', o, (view) => {
                view.render();

                this.listenToOnce(view, 'proceed', (dialogData) => {
                    if (!dialogData.exportAllFields) {
                        data.attributeList = dialogData.attributeList;
                        data.fieldList = dialogData.fieldList;
                    }

                    data.format = dialogData.format;

                    Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

                    Espo.Ajax
                        .postRequest(url, data, {timeout: 0})
                        .then((data) => {
                            Espo.Ui.notify(false);

                            if ('id' in data) {
                                window.location = this.getBasePath() + '?entryPoint=download&id=' + data.id;
                            }
                        });
                });
            });
        },

        massAction: function (name) {
            var defs = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', name]) || {};

            var handler = defs.handler;

            if (handler) {
                var method = 'action' + Espo.Utils.upperCaseFirst(name);

                var data = {
                    entityType: this.entityType,
                    action: name,
                    params: this.getMassActionSelectionPostData(),
                };

                require(handler, (Handler) => {
                    var handler = new Handler(this);

                    handler[method].call(handler, data);
                });

                return;
            }

            var bypassConfirmation = defs.bypassConfirmation || false;
            var confirmationMsg = defs.confirmationMessage || 'confirmation';
            var acl = defs.acl;
            var aclScope = defs.aclScope;

            var proceed = function () {
                if (acl || aclScope) {
                    if (!this.getAcl().check(aclScope || this.scope, acl)) {
                        this.notify('Access denied', 'error');

                        return;
                    }
                }

                var idList = [];
                var data = {};

                if (this.allResultIsChecked) {
                    data.where = this.collection.getWhere();
                    data.searchParams =  this.collection.data || {};
                    data.selectData = data.searchData; // for bc;
                    data.byWhere = true; // for bc
                }
                else {
                    data.idList = idList; // for bc
                    data.ids = idList;
                }

                for (var i in this.checkedList) {
                    idList.push(this.checkedList[i]);
                }

                data.entityType = this.entityType;

                var waitMessage = this.getMetadata().get(
                    ['clientDefs', this.scope, 'massActionDefs', name, 'waitMessage']
                ) || 'pleaseWait';

                Espo.Ui.notify(this.translate(waitMessage, 'messages', this.scope));

                var url = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', name, 'url']);

                this.ajaxPostRequest(url, data)
                    .then((result)=> {
                        var successMessage = result.successMessage ||
                            this.getMetadata().get(
                            ['clientDefs', this.scope, 'massActionDefs', name, 'successMessage']
                        ) || 'done';

                        this.collection
                            .fetch()
                            .then(() => {
                                var message = this.translate(successMessage, 'messages', this.scope);

                                if ('count' in result) {
                                    message = message.replace('{count}', result.count);
                                }

                                Espo.Ui.success(message);
                            });
                    });
            };

            if (!bypassConfirmation) {
                this.confirm(this.translate(confirmationMsg, 'messages', this.scope), proceed, this);
            }
            else {
                proceed.call(this);
            }
        },

        getMassActionSelectionPostData: function () {
            var data = {};

            if (this.allResultIsChecked) {
                data.where = this.collection.getWhere();
                data.searchParams = this.collection.data || {};
                data.selectData = this.collection.data || {}; // for bc;
                data.byWhere = true; // for bc;
            }
            else {
                data.ids = [];

                for (var i in this.checkedList) {
                    data.ids.push(this.checkedList[i]);
                }
            }

            return data;
        },

        massActionRecalculateFormula: function () {
            var ids = false;

            var allResultIsChecked = this.allResultIsChecked;

            if (!allResultIsChecked) {
                ids = this.checkedList;
            }

            this.confirm({
                message: this.translate('recalculateFormulaConfirmation', 'messages'),
                confirmText: this.translate('Yes'),
            }, () => {
                Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

                Espo.Ajax.postRequest('MassAction', {
                    entityType: this.entityType,
                    action: 'recalculateFormula',
                    params: this.getMassActionSelectionPostData(),
                })
                    .then((result) => {
                        result = result || {};

                        this.collection
                            .fetch()
                            .then(() => {
                                Espo.Ui.success(this.translate('Done'));

                                if (allResultIsChecked) {
                                    this.selectAllResult();
                                }
                                else {
                                    ids.forEach((id) => {
                                        this.checkRecord(id);
                                    });
                                }
                            });
                    });
            });
        },

        massActionRemove: function () {
            if (!this.getAcl().check(this.entityType, 'delete')) {
                this.notify('Access denied', 'error');

                return false;
            }

            this.confirm({
                message: this.translate('removeSelectedRecordsConfirmation', 'messages', this.scope),
                confirmText: this.translate('Remove'),
            }, () => {
                this.notify('Removing...');

                Espo.Ajax.postRequest('MassAction', {
                    entityType: this.entityType,
                    action: 'delete',
                    params: this.getMassActionSelectionPostData(),
                })
                .then((result) => {
                    result = result || {};

                    var count = result.count;

                    if (this.allResultIsChecked) {
                        if (count) {
                            this.unselectAllResult();

                            this.listenToOnce(this.collection, 'sync', () => {
                                var msg = 'massRemoveResult';

                                if (count === 1) {
                                    msg = 'massRemoveResultSingle';
                                }

                                Espo.Ui.success(this.translate(msg, 'messages').replace('{count}', count));
                            });

                            this.collection.fetch();

                            Espo.Ui.notify(false);
                        }
                        else {
                            Espo.Ui.warning(this.translate('noRecordsRemoved', 'messages'));
                        }
                    }
                    else {
                        var idsRemoved = result.ids || [];

                        if (count) {
                            idsRemoved.forEach((id) => {
                                Espo.Ui.notify(false);

                                this.collection.trigger('model-removing', id);
                                this.removeRecordFromList(id);
                                this.uncheckRecord(id, null, true);
                            });

                            var msg = 'massRemoveResult';

                            if (count === 1) {
                                msg = 'massRemoveResultSingle';
                            }

                            Espo.Ui.success(this.translate(msg, 'messages').replace('{count}', count));
                        }
                        else {
                            Espo.Ui.warning(this.translate('noRecordsRemoved', 'messages'));
                        }
                    }
                });
            });
        },

        massActionPrintPdf: function () {
            var maxCount = this.getConfig().get('massPrintPdfMaxCount');

            if (maxCount) {
                if (this.checkedList.length > maxCount) {
                    var msg = this.translate('massPrintPdfMaxCountError', 'messages')
                        .replace('{maxCount}', maxCount.toString());

                    Espo.Ui.error(msg);

                    return;
                }
            }

            var idList = [];

            for (var i in this.checkedList) {
                idList.push(this.checkedList[i]);
            }

            this.createView('pdfTemplate', 'views/modals/select-template', {
                entityType: this.entityType,
            }, (view) => {
                view.render();

                this.listenToOnce(view, 'select', (templateModel) => {
                    this.clearView('pdfTemplate');

                    Espo.Ui.notify(this.translate('loading', 'messages'));

                    this.ajaxPostRequest(
                            'Pdf/action/massPrint',
                            {
                                idList: idList,
                                entityType: this.entityType,
                                templateId: templateModel.id,
                            },
                            {timeout: 0}
                        )
                        .then((result) => {
                            Espo.Ui.notify(false);

                            window.open('?entryPoint=download&id=' + result.id, '_blank');
                        });
                });
            });
        },

        massActionFollow: function () {
            var count = this.checkedList.length;

            var confirmMsg = this.translate('confirmMassFollow', 'messages')
                .replace('{count}', count.toString());

            this.confirm({
                message: confirmMsg,
                confirmText: this.translate('Follow'),
            }, () => {
                Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

                this.ajaxPostRequest('MassAction', {
                    action: 'follow',
                    entityType: this.entityType,
                    params: this.getMassActionSelectionPostData(),
                })
                    .then((result) => {
                            var resultCount = result.count || 0;

                            var msg = 'massFollowResult';

                            if (resultCount) {
                                if (resultCount === 1) {
                                    msg += 'Single';
                                }

                                Espo.Ui.success(
                                    this.translate(msg, 'messages').replace('{count}', resultCount)
                                );
                            }
                            else {
                                Espo.Ui.warning(
                                    this.translate('massFollowZeroResult', 'messages')
                                );
                            }
                    });
            });
        },

        massActionUnfollow: function () {
            var count = this.checkedList.length;

            var confirmMsg = this.translate('confirmMassUnfollow', 'messages')
                .replace('{count}', count.toString());

            this.confirm({
                message: confirmMsg,
                confirmText: this.translate('Unfollow'),
            }, () => {
                Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

                this.ajaxPostRequest('MassAction', {
                    action: 'unfollow',
                    entityType: this.entityType,
                    params: this.getMassActionSelectionPostData(),
                })
                    .then((result) => {
                        var resultCount = result.count || 0;

                        var msg = 'massUnfollowResult';

                        if (resultCount) {
                            if (resultCount === 1) {
                                msg += 'Single';
                            }

                            Espo.Ui.success(
                                this.translate(msg, 'messages').replace('{count}', resultCount)
                            );
                        }
                        else {
                            Espo.Ui.warning(
                                this.translate('massUnfollowZeroResult', 'messages')
                            );
                        }
                    });
            });
        },

        massActionMerge: function () {
            if (!this.getAcl().check(this.entityType, 'edit')) {
                this.notify('Access denied', 'error');

                return false;
            }

            if (this.checkedList.length < 2) {
                this.notify('Select 2 or more records', 'error');

                return;
            }
            if (this.checkedList.length > 4) {
                this.notify('Select not more than 4 records', 'error');

                return;
            }
            this.checkedList.sort();

            var url = '#' + this.entityType + '/merge/ids=' + this.checkedList.join(',');

            this.getRouter().navigate(url, {trigger: false});

            this.getRouter().dispatch(this.entityType, 'merge', {
                ids: this.checkedList.join(','),
                collection: this.collection,
            });
        },

        massActionMassUpdate: function () {
            if (!this.getAcl().check(this.entityType, 'edit')) {
                this.notify('Access denied', 'error');

                return false;
            }

            Espo.Ui.notify(this.translate('loading', 'messages'));

            var ids = false;

            var allResultIsChecked = this.allResultIsChecked;

            if (!allResultIsChecked) {
                ids = this.checkedList;
            }

            var viewName = this.getMetadata().get(['clientDefs', this.entityType, 'modalViews', 'massUpdate']) ||
                'views/modals/mass-update';

            this.createView('massUpdate', viewName, {
                scope: this.scope,
                entityType: this.entityType,
                ids: ids,
                where: this.collection.getWhere(),
                searchParams: this.collection.data,
                byWhere: this.allResultIsChecked,
            }, (view) => {
                view.render();

                view.notify(false);

                view.once('after:update', (count) => {
                    view.close();

                    this.listenToOnce(this.collection, 'sync', () => {
                        if (count) {
                            var msg = 'massUpdateResult';

                            if (count === 1) {
                                msg = 'massUpdateResultSingle';
                            }

                            Espo.Ui.success(this.translate(msg, 'messages').replace('{count}', count));
                        }
                        else {
                            Espo.Ui.warning(this.translate('noRecordsUpdated', 'messages'));
                        }

                        if (allResultIsChecked) {
                            this.selectAllResult();
                        }
                        else {
                            ids.forEach((id) => {
                                this.checkRecord(id);
                            });
                        }
                    });

                    this.collection.fetch();
                });
            });
        },

        massActionExport: function () {
            if (!this.getConfig().get('exportDisabled') || this.getUser().isAdmin()) {
                this.export();
            }
        },

        massActionUnlink: function () {
            this.confirm({
                message: this.translate('unlinkSelectedRecordsConfirmation', 'messages'),
                confirmText: this.translate('Unlink'),
            }, () => {
                this.notify('Unlinking...');

                Espo.Ajax.deleteRequest(this.collection.url, {
                    ids: this.checkedList,
                }).then(() => {
                    this.notify('Unlinked', 'success');

                    this.collection.fetch();

                    this.model.trigger('after:unrelate');
                });
            });
        },

        massActionConvertCurrency: function () {
            var ids = false;

            var allResultIsChecked = this.allResultIsChecked;

            if (!allResultIsChecked) {
                ids = this.checkedList;
            }

            this.createView('modalConvertCurrency', 'views/modals/mass-convert-currency', {
                entityType: this.entityType,
                ids: ids,
                where: this.collection.getWhere(),
                searchParams: this.collection.data,
                byWhere: this.allResultIsChecked,
            }, (view) => {
                view.render();

                this.listenToOnce(view, 'after:update', (count) => {
                    this.listenToOnce(this.collection, 'sync', () => {
                        if (count) {
                            var msg = 'massUpdateResult';

                            if (count === 1) {
                                msg = 'massUpdateResultSingle';
                            }

                            Espo.Ui.success(this.translate(msg, 'messages').replace('{count}', count));
                        }
                        else {
                            Espo.Ui.warning(this.translate('noRecordsUpdated', 'messages'));
                        }

                        if (allResultIsChecked) {
                            this.selectAllResult();
                        }
                        else {
                            ids.forEach((id) => {
                                this.checkRecord(id);
                            });
                        }
                    });

                    this.collection.fetch();
                });
            });
        },

        removeMassAction: function (item) {
            var index = this.massActionList.indexOf(item);

            if (~index) {
                this.massActionList.splice(index, 1);
            }

            var index = this.checkAllResultMassActionList.indexOf(item);

            if (~index) {
                this.checkAllResultMassActionList.splice(index, 1);
            }
        },

        addMassAction: function (item, allResult, toBeginning) {
            var method = toBeginning ? 'unshift' : 'push';

            this.massActionList[method](item);

            if (allResult) {
                this.checkAllResultMassActionList[method](item);
            }

            if (!this.checkboxesDisabled) {
                this.checkboxes = true;
            }
        },

        removeAllResultMassAction: function (item) {
            var index = this.checkAllResultMassActionList.indexOf(item);

            if (~index) {
                this.checkAllResultMassActionList.splice(index, 1);
            }
        },

        setup: function () {
            if (typeof this.collection === 'undefined') {
                throw new Error('Collection has not been injected into views/record/list view.');
            }

            this.layoutLoadCallbackList = [];

            this.entityType = this.collection.name || null;
            this.scope = this.options.scope || this.entityType;

            this.events = Espo.Utils.clone(this.events);
            this.massActionList = Espo.Utils.clone(this.massActionList);
            this.buttonList = Espo.Utils.clone(this.buttonList);

            this.mandatorySelectAttributeList = Espo.Utils.clone(
                this.options.mandatorySelectAttributeList || this.mandatorySelectAttributeList || []
            );

            this.editDisabled = this.options.editDisabled ||
                this.getMetadata().get(['clientDefs', this.scope, 'editDisabled']);

            this.removeDisabled = this.options.removeDisabled ||
                this.getMetadata().get(['clientDefs', this.scope, 'removeDisabled']);

            if (!this.getAcl().checkScope(this.entityType, 'delete')) {
                this.removeMassAction('remove');
                this.removeMassAction('merge');
            }

            if (this.removeDisabled) {
                this.removeMassAction('remove');
            }

            if (!this.getAcl().checkScope(this.entityType, 'edit')) {
                this.removeMassAction('massUpdate');
                this.removeMassAction('merge');
            }

            if (this.getMetadata().get(['clientDefs', this.scope, 'mergeDisabled'])) {
                this.removeMassAction('merge');
            }

            var metadataMassActionList = (
                    this.getMetadata().get(['clientDefs', this.scope, 'massActionList']) || []
                ).concat(
                    this.getMetadata().get(['clientDefs', 'Global', 'massActionList']) || []
                );

            metadataMassActionList.forEach(function (item) {
                var defs = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', item]) || {};

                if (!Espo.Utils.checkActionAvailability(this.getHelper(), defs)) {
                    return;
                }

                if (!Espo.Utils.checkActionAccess(this.getAcl(), null, defs)) {
                    return;
                }

                this.massActionList.push(item);
            }, this);

            var checkAllResultMassActionList = [];

            this.checkAllResultMassActionList.forEach(function (item) {
                if (~this.massActionList.indexOf(item)) {
                    checkAllResultMassActionList.push(item);
                }
            }, this);

            this.checkAllResultMassActionList = checkAllResultMassActionList;

            var metadataCheckkAllMassActionList = (
                    this.getMetadata().get(['clientDefs', this.scope, 'checkAllResultMassActionList']) || []
                ).concat(
                    this.getMetadata().get(['clientDefs', 'Global', 'checkAllResultMassActionList']) || []
                );

            metadataCheckkAllMassActionList.forEach(function (item) {
                if (this.collection.url !== this.entityType) {
                    return;
                }

                if (~this.massActionList.indexOf(item)) {
                    var defs = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', item]) || {};

                    if (!Espo.Utils.checkActionAvailability(this.getHelper(), defs)) {
                        return;
                    }

                    if (!Espo.Utils.checkActionAccess(this.getAcl(), null, defs)) {
                        return;
                    }

                    this.checkAllResultMassActionList.push(item);
                }
            }, this);

            metadataMassActionList
                .concat(metadataCheckkAllMassActionList)
                .forEach((action) => {
                       var defs = this.getMetadata().get(['clientDefs', this.scope, 'massActionDefs', action]) || {};

                    if (!defs.initFunction || !defs.handler) {
                        return;
                    }

                    var viewObject = this;

                    this.wait(
                        new Promise((resolve) => {
                            require(defs.handler, (Handler) => {
                                var handler = new Handler(viewObject);

                                handler[defs.initFunction].call(handler);

                                resolve();
                            });
                        })
                    );
                });

            if (
                this.getConfig().get('exportDisabled') && !this.getUser().isAdmin()
                ||
                this.getAcl().get('exportPermission') === 'no'
                ||
                this.getMetadata().get(['clientDefs', this.scope, 'exportDisabled'])
            ) {
                this.removeMassAction('export');
            }

            if (this.getAcl().get('massUpdatePermission') !== 'yes' || this.editDisabled) {
                this.removeMassAction('massUpdate');
            }

            if (
                !this.massFollowDisabled &&
                this.getMetadata().get(['scopes', this.entityType, 'stream']) &&
                this.getAcl().check(this.entityType, 'stream')
            ) {
                this.addMassAction('follow');
                this.addMassAction('unfollow', true);
            }

            if (
                !this.massPrintPdfDisabled
                &&
                ~(this.getHelper().getAppParam('templateEntityTypeList') || []).indexOf(this.entityType)
            ) {
                this.addMassAction('printPdf');
            }

            if (this.options.unlinkMassAction && this.collection) {
                this.addMassAction('unlink', false, true);
            }

            if (
                !this.massConvertCurrencyDisabled &&
                !this.getMetadata().get(['clientDefs', this.scope, 'convertCurrencyDisabled']) &&
                this.getConfig().get('currencyList').length > 1 &&
                this.getAcl().checkScope(this.scope, 'edit') &&
                this.getAcl().get('massUpdatePermission') === 'yes'
            ) {
                var currencyFieldList = this.getFieldManager().getEntityTypeFieldList(this.entityType, {
                    type: 'currency',
                    acl: 'edit',
                });

                if (currencyFieldList.length)
                    this.addMassAction('convertCurrency', true);
            }

            this.setupMassActionItems();

            if (this.getUser().isAdmin()) {
                if (this.getMetadata().get(['formula', this.entityType, 'beforeSaveCustomScript'])) {
                    this.addMassAction('recalculateFormula', true);
                }
            }

            if (this.collection.url !== this.entityType) {
                Espo.Utils.clone(this.checkAllResultMassActionList).forEach((item) => {
                    this.removeAllResultMassAction(item);
                });
            }

            if (this.forcedCheckAllResultMassActionList) {
                this.checkAllResultMassActionList = this.forcedCheckAllResultMassActionList;
            }

            if (this.getAcl().get('massUpdatePermission') !== 'yes') {
                this.removeAllResultMassAction('remove');
            }

            Espo.Utils.clone(this.massActionList).forEach((item) => {
                var propName = 'massAction' + Espo.Utils.upperCaseFirst(item) + 'Disabled';

                if (this[propName] || this.options[propName]) {
                    this.removeMassAction(item);
                }
            });

            if (this.selectable) {
                this.events['click .list a.link'] = function (e) {
                    e.preventDefault();

                    var id = $(e.target).attr('data-id');

                    if (id) {
                        var model = this.collection.get(id);

                        if (this.checkboxes) {
                            var list = [];

                            list.push(model);

                            this.trigger('select', list);
                        }
                        else {
                            this.trigger('select', model);
                        }
                    }

                    e.stopPropagation();
                };
            }

            if ('showCount' in this.options) {
                this.showCount = this.options.showCount;
            }

            this.displayTotalCount = this.showCount && this.getConfig().get('displayListViewRecordCount');

            if ('displayTotalCount' in this.options) {
                this.displayTotalCount = this.options.displayTotalCount;
            }

            this.forceDisplayTopBar = this.options.forceDisplayTopBar || this.forceDisplayTopBar;

            if (this.massActionsDisabled) {
                this.massActionList = [];
            }

            if (!this.massActionList.length && !this.selectable) {
                this.checkboxes = false;
            }

            if (this.getUser().isPortal() && !this.portalLayoutDisabled) {
                if (this.getMetadata().get(
                    ['clientDefs', this.scope, 'additionalLayouts', this.layoutName + 'Portal'])
                ) {
                    this.layoutName += 'Portal';
                }
            }

            this.getHelper().processSetupHandlers(this, this.setupHandlerType);

            this.listenTo(this.collection, 'sync', (c, r, options) => {
                if (this.hasView('modal') && this.getView('modal').isRendered()) {
                    return;
                }

                if (this.noRebuild) {
                    this.noRebuild = null;

                    return;
                }

                this.checkedList = [];

                this.allResultIsChecked = false;

                this.buildRows(() => {
                    this.render();
                });
            });

            this.checkedList = [];

            if (!this.options.skipBuildRows) {
                this.buildRows();
            }
        },

        afterRender: function () {
            if (this.allResultIsChecked) {
                this.selectAllResult();
            }
            else {
                if (this.checkedList.length) {
                    this.checkedList.forEach((id) => {
                        this.checkRecord(id);
                    });
                }
            }
        },

        setupMassActionItems: function () {},

        filterListLayout: function (listLayout) {
            if (this._cachedFilteredListLayout) {
                return this._cachedFilteredListLayout;
            }

            var forbiddenFieldList = this._cachedScopeForbiddenFieldList =
                this._cachedScopeForbiddenFieldList ||
                this.getAcl().getScopeForbiddenFieldList(this.entityType, 'read');

            if (this.layoutAclDisabled) {
                forbiddenFieldList = [];
            }

            if (!forbiddenFieldList.length) {
                this._cachedFilteredListLayout = listLayout;

                return this._cachedFilteredListLayout;
            }

            var filteredListLayout = Espo.Utils.clone(listLayout);

            for (var i in listLayout) {
                var name = listLayout[i].name;

                if (name && ~forbiddenFieldList.indexOf(name)) {
                    filteredListLayout[i].customLabel = '';
                    filteredListLayout[i].notSortable = true;
                }
            }

            this._cachedFilteredListLayout = filteredListLayout;

            return this._cachedFilteredListLayout;
        },

        _loadListLayout: function (callback) {
            this.layoutLoadCallbackList.push(callback);

            if (this.layoutIsBeingLoaded) return;

            this.layoutIsBeingLoaded = true;

            var layoutName = this.layoutName;

            var layoutScope = this.layoutScope || this.collection.name;

            this._helper.layoutManager.get(layoutScope, layoutName, (listLayout) => {
                var filteredListLayout = this.filterListLayout(listLayout);

                this.layoutLoadCallbackList.forEach((callbackItem) => {
                    callbackItem(filteredListLayout);

                    this.layoutLoadCallbackList = [];

                    this.layoutIsBeingLoaded = false;
                });
            });
        },

        getSelectAttributeList: function (callback) {
            if (this.scope === null || this.rowHasOwnLayout) {
                callback(null);

                return;
            }

            if (this.listLayout) {
                var attributeList = this.fetchAttributeListFromLayout();

                callback(attributeList);

                return;
            }
            else {
                this._loadListLayout((listLayout) => {
                    this.listLayout = listLayout;

                    var attributeList = this.fetchAttributeListFromLayout();

                    if (this.mandatorySelectAttributeList) {
                        attributeList = attributeList.concat(attributeList);
                    }

                    callback(attributeList);
                });

                return;
            }
        },

        fetchAttributeListFromLayout: function () {
            var list = [];

            this.listLayout.forEach((item) => {
                if (!item.name) {
                    return;
                }

                var field = item.name;

                var fieldType = this.getMetadata().get(['entityDefs', this.scope, 'fields', field, 'type']);

                if (!fieldType) {
                    return;
                }

                this.getFieldManager()
                    .getEntityTypeFieldAttributeList(this.scope, field)
                    .forEach((attribute) => {
                        list.push(attribute);
                    });
            });

            return list;
        },

        _getHeaderDefs: function () {
            var defs = [];

            for (var i in this.listLayout) {
                var width = false;

                if ('width' in this.listLayout[i] && this.listLayout[i].width !== null) {
                    width = this.listLayout[i].width + '%';
                }
                else if ('widthPx' in this.listLayout[i]) {
                    width = this.listLayout[i].widthPx;
                }

                var itemName = this.listLayout[i].name;

                var item = {
                    name: itemName,
                    isSortable: !(this.listLayout[i].notSortable || false),
                    width: width,
                    align: ('align' in this.listLayout[i]) ? this.listLayout[i].align : false,
                };

                if ('customLabel' in this.listLayout[i]) {
                    item.customLabel = this.listLayout[i].customLabel;
                    item.hasCustomLabel = true;
                    item.label = item.customLabel;
                }
                else {
                    item.label = this.translate(itemName, 'fields', this.collection.entityType);
                }

                if (item.isSortable) {
                    item.isSorted = this.collection.orderBy === itemName;

                    if (item.isSorted) {
                        item.isDesc = this.collection.order === 'desc' ;
                    }
                }

                defs.push(item);
            };

            if (this.rowActionsView && !this.rowActionsDisabled) {
                defs.push({
                    width: this.rowActionsColumnWidth
                });
            }

            return defs;
        },

        _convertLayout: function (listLayout, model) {
            model = model || this.collection.model.prototype;

            var layout = [];

            if (this.checkboxes) {
                layout.push({
                    name: 'r-checkboxField',
                    columnName: 'r-checkbox',
                    template: 'record/list-checkbox'
                });
            }

            for (var i in listLayout) {
                var col = listLayout[i];
                var type = col.type || model.getFieldType(col.name) || 'base';

                if (!col.name) {
                    continue;
                }

                var item = {
                    columnName: col.name,
                    name: col.name + 'Field',
                    view: col.view ||
                        model.getFieldParam(col.name, 'view') ||
                        this.getFieldManager().getViewName(type),
                    options: {
                        defs: {
                            name: col.name,
                            params: col.params || {}
                        },
                        mode: 'list'
                    }
                };

                if (col.width) {
                    item.options.defs.width = col.width;
                }

                if (col.widthPx) {
                    item.options.defs.widthPx = col.widthPx;
                }

                if (col.link) {
                    item.options.mode = 'listLink';
                }
                if (col.align) {
                    item.options.defs.align = col.align;
                }

                layout.push(item);
            }
            if (this.rowActionsView && !this.rowActionsDisabled) {
                layout.push(this.getRowActionsDefs());
            }

            return layout;
        },

        checkRecord: function (id, $target, isSilent) {
            $target = $target || this.$el.find('.record-checkbox[data-id="' + id + '"]');

            if (!$target.length) {
                return;
            }

            $target.get(0).checked = true;

            var index = this.checkedList.indexOf(id);

            if (index === -1) {
                this.checkedList.push(id);
            }

            $target.closest('tr').addClass('active');

            this.handleAfterCheck(isSilent);
        },

        uncheckRecord: function (id, $target, isSilent) {
            $target = $target || this.$el.find('.record-checkbox[data-id="' + id + '"]');

            if ($target.get(0)) {
                $target.get(0).checked = false;
            }

            var index = this.checkedList.indexOf(id);

            if (index !== -1) {
                this.checkedList.splice(index, 1);
            }

            if ($target.get(0)) {
                $target.closest('tr').removeClass('active');
            }

            this.handleAfterCheck(isSilent);
        },

        handleAfterCheck: function (isSilent) {
            if (this.checkedList.length) {
                this.showActions();
            }
            else {
                this.hideActions();
            }

            if (this.checkedList.length === this.collection.models.length) {
                this.$el.find('.select-all').prop('checked', true);
            }
            else {
                this.$el.find('.select-all').prop('checked', false);
            }

            if (!isSilent) {
                this.trigger('check');
            }
        },

        getRowActionsDefs: function () {
            var options = {
                defs: {
                    params: {}
                }
            };

            if (this.options.rowActionsOptions) {
                for (var item in this.options.rowActionsOptions) {
                    options[item] = this.options.rowActionsOptions[item];
                }
            }

            return {
                columnName: 'buttons',
                name: 'buttonsField',
                view: this.rowActionsView,
                options: options
            };
        },

        /**
         * Returns checked models.
         * @return {Array} Array of models
         */
        getSelected: function () {
            var list = [];

            this.$el.find('input.record-checkbox:checked').each((i, el) => {

                var id = $(el).attr('data-id');

                var model = this.collection.get(id);

                list.push(model);
            });

            return list;
        },

        getInternalLayoutForModel: function (callback, model) {
            var scope = model.name;

            if (this._internalLayout === null) {
                this._internalLayout = {};
            }

            if (!(scope in this._internalLayout)) {
                this._internalLayout[scope] = this._convertLayout(this.listLayout[scope], model);
            }

            callback(this._internalLayout[scope]);
        },

        getInternalLayout: function (callback, model) {
            if (this.scope === null || this.rowHasOwnLayout) {
                if (!model) {
                    callback(null);

                    return;
                }
                else {
                    this.getInternalLayoutForModel(callback, model);

                    return;
                }
            }

            if (this._internalLayout !== null) {
                callback(this._internalLayout);

                return;
            }

            if (this.listLayout !== null) {
                this._internalLayout = this._convertLayout(this.listLayout);

                callback(this._internalLayout);

                return;
            }

            this._loadListLayout((listLayout) => {
                this.listLayout = listLayout;
                this._internalLayout = this._convertLayout(listLayout);

                callback(this._internalLayout);

                return;
            });
        },

        getItemEl: function (model, item) {
            return this.options.el + ' tr[data-id="' + model.id + '"] ' +
                'td.cell[data-name="' + item.columnName + '"]';
        },

        prepareInternalLayout: function (internalLayout, model) {
            internalLayout.forEach((item) => {
                item.el = this.getItemEl(model, item);
            });
        },

        buildRow: function (i, model, callback) {
            var key = model.id;

            this.rowList.push(key);

            this.getInternalLayout((internalLayout) => {
                internalLayout = Espo.Utils.cloneDeep(internalLayout);

                this.prepareInternalLayout(internalLayout, model);

                var acl =  {
                    edit: this.getAcl().checkModel(model, 'edit') && !this.editDisabled,
                    delete: this.getAcl().checkModel(model, 'delete') && !this.removeDisabled,
                };

                this.createView(key, 'views/base', {
                    model: model,
                    acl: acl,
                    el: this.options.el + ' .list-row[data-id="'+key+'"]',
                    optionsToPass: ['acl'],
                    noCache: true,
                    _layout: {
                        type: this._internalLayoutType,
                        layout: internalLayout
                    },
                    name: this.type + '-' + model.name,
                    setViewBeforeCallback: this.options.skipBuildRows && !this.isRendered(),
                }, callback);
            }, model);
        },

        buildRows: function (callback) {
            this.checkedList = [];

            this.rowList = [];

            if (this.collection.length <= 0) {
                if (typeof callback === 'function') {
                    callback();

                    this.trigger('after:build-rows');
                }

                return;
            }

            var iteration = 0;
            var repeatCount = !this.pagination ? 1 : 2;

            var callbackWrapped = function () {
                iteration++;

                if (iteration === repeatCount) {
                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            };

            this.wait(true);

            var modelList = this.collection.models;

            var count = modelList.length;

            var builtCount = 0;

            modelList.forEach((model) => {
                this.buildRow(iteration, model, () => {
                    builtCount++;

                    if (builtCount === count) {
                        callbackWrapped();

                        this.wait(false);

                        this.trigger('after:build-rows');
                    }
                });
            });


            if (this.pagination) {
                this.createView('pagination', 'views/record/list-pagination', {
                    collection: this.collection,
                }, callbackWrapped);
            }
        },

        showMoreRecords: function (collection, $list, $showMore, callback) {
            collection = collection || this.collection;

            $showMore =  $showMore || this.$el.find('.show-more');

            $list = $list || this.$el.find(this.listContainerEl);

            $showMore.children('a').addClass('disabled');

            Espo.Ui.notify(this.translate('loading', 'messages'));

            var final = () => {
                $showMore.parent().append($showMore);

                if (
                    collection.total > collection.length + collection.lengthCorrection ||
                    collection.total === -1
                ) {
                    var moreCount = collection.total - collection.length - collection.lengthCorrection;
                    var moreCountString = this.getNumberUtil().formatInt(moreCount);

                    this.$el.find('.more-count').text(moreCountString);

                    $showMore.removeClass('hidden');
                }

                $showMore.children('a').removeClass('disabled');

                if (this.allResultIsChecked) {
                    this.$el
                        .find('input.record-checkbox')
                        .attr('disabled', 'disabled')
                        .prop('checked', true);
                }

                Espo.Ui.notify(false);

                if (callback) {
                    callback.call(this);
                }
            };

            var initialCount = collection.length;

            var success = () => {
                Espo.Ui.notify(false);

                $showMore.addClass('hidden');

                var rowCount = collection.length - initialCount;
                var rowsReady = 0;

                if (collection.length <= initialCount) {
                    final();
                }

                for (var i = initialCount; i < collection.length; i++) {
                    var model = collection.at(i);

                    this.buildRow(i, model, (view) => {
                        var model = view.model;

                        view.getHtml((html) => {
                            var $row = $(this.getRowContainerHtml(model.id));

                            $row.append(html);

                            var $existingRowItem = this.getDomRowItem(model.id);

                            if ($existingRowItem && $existingRowItem.length) {
                                $existingRowItem.remove();
                            }

                            $list.append($row);

                            rowsReady++;

                            if (rowsReady === rowCount) {
                                final();
                            }

                            view._afterRender();

                            if (view.options.el) {
                                view.setElement(view.options.el);
                            }
                        });
                    });
                }

                this.noRebuild = true;
            };

            this.listenToOnce(collection, 'update', (collection, o) => {
                if (o.changes.merged.length) {
                    collection.lengthCorrection += o.changes.merged.length;
                }
            });

            collection.fetch({
                success: success,
                remove: false,
                more: true,
            });
        },

        getDomRowItem: function (id) {
            return null;
        },

        getRowContainerHtml: function (id) {
            return '<tr data-id="'+id+'" class="list-row"></tr>';
        },

        actionQuickView: function (data) {
            data = data || {};

            var id = data.id;

            if (!id) {
                return;
            }

            var model = null;

            if (this.collection) {
                model = this.collection.get(id);
            }

            if (!data.scope && !model) {
                return;
            }

            var scope = data.scope || model.name || this.scope;

            var viewName = this.getMetadata().get('clientDefs.' + scope + '.modalViews.detail') ||
                'views/modals/detail';

            if (!this.quickDetailDisabled) {
                Espo.Ui.notify(this.translate('loading', 'messages'));

                var options = {
                    scope: scope,
                    model: model,
                    id: id,
                    quickEditDisabled: this.quickEditDisabled,
                };

                if (this.options.keepCurrentRootUrl) {
                    options.rootUrl = this.getRouter().getCurrentUrl();
                }

                this.createView('modal', viewName, options, (view) => {
                    this.listenToOnce(view, 'after:render', () => {
                        Espo.Ui.notify(false);
                    });

                    view.render();

                    this.listenToOnce(view, 'remove', () => {
                        this.clearView('modal');
                    });

                    this.listenToOnce(view, 'after:edit-cancel', () => {
                        this.actionQuickView({id: view.model.id, scope: view.model.name});
                    });

                    this.listenToOnce(view, 'after:save', (model) => {
                        this.trigger('after:save', model);
                    });
                });
            }
            else {
                this.getRouter().navigate('#' + scope + '/view/' + id, {trigger: true});
            }
        },

        actionQuickEdit: function (data) {
            data = data || {};

            var id = data.id;

            if (!id) {
                return;
            }

            var model = null;

            if (this.collection) {
                model = this.collection.get(id);
            }

            if (!data.scope && !model) {
                return;
            }

            var scope = data.scope || model.name || this.scope;

            var viewName = this.getMetadata().get('clientDefs.' + scope + '.modalViews.edit') ||
                'views/modals/edit';

            if (!this.quickEditDisabled) {
                Espo.Ui.notify(this.translate('loading', 'messages'));

                var options = {
                    scope: scope,
                    id: id,
                    model: model,
                    fullFormDisabled: data.noFullForm,
                    returnUrl: this.getRouter().getCurrentUrl(),
                    returnDispatchParams: {
                        controller: scope,
                        action: null,
                        options: {
                            isReturn: true,
                        },
                    },
                };
                if (this.options.keepCurrentRootUrl) {
                    options.rootUrl = this.getRouter().getCurrentUrl();
                }

                this.createView('modal', viewName, options, (view) => {
                    view.once('after:render', () => {
                        Espo.Ui.notify(false);
                    });

                    view.render();

                    this.listenToOnce(view, 'remove', () => {
                        this.clearView('modal');
                    });

                    this.listenToOnce(view, 'after:save', (m) => {
                        var model = this.collection.get(m.id);

                        if (model) {
                            model.set(m.getClonedAttributes());
                        }

                        this.trigger('after:save', m);
                    });
                });
            }
            else {
                var options = {
                    id: id,
                    model: this.collection.get(id),
                    returnUrl: this.getRouter().getCurrentUrl(),
                    returnDispatchParams: {
                        controller: scope,
                        action: null,
                        options: {
                            isReturn: true,
                        }
                    },
                };

                if (this.options.keepCurrentRootUrl) {
                    options.rootUrl = this.getRouter().getCurrentUrl();
                }

                this.getRouter().navigate('#' + scope + '/edit/' + id, {trigger: false});

                this.getRouter().dispatch(scope, 'edit', options);
            }
        },

        getRowSelector: function (id) {
            return 'tr[data-id="' + id + '"]';
        },

        actionQuickRemove: function (data) {
            data = data || {};

            var id = data.id;

            if (!id) {
                return;
            }

            var model = this.collection.get(id);

            if (!this.getAcl().checkModel(model, 'delete')) {
                this.notify('Access denied', 'error');

                return false;
            }

            this.confirm({
                message: this.translate('removeRecordConfirmation', 'messages', this.scope),
                confirmText: this.translate('Remove'),
            }, () => {
                this.collection.trigger('model-removing', id);
                this.collection.remove(model);

                this.notify('Removing...');

                model.destroy({wait: true})
                    .then(() => {
                        this.notify('Removed', 'success');

                        this.removeRecordFromList(id);
                    })
                    .catch(() => {
                        this.notify('Error occurred', 'error');

                        this.collection.push(model);
                    });
            });
        },

        removeRecordFromList: function (id) {
            this.collection.remove(id);

            if (this.collection.total > 0) {
                this.collection.total--;
            }

            this.$el.find('.total-count-span').text(this.collection.total.toString());

            var index = this.checkedList.indexOf(id);

            if (index !== -1) {
                this.checkedList.splice(index, 1);
            }

            this.removeRowHtml(id);

            var key = id;

            this.clearView(key);

            var index = this.rowList.indexOf(key);

            if (~index) {
                this.rowList.splice(index, 1);
            }
        },

        removeRowHtml: function (id) {
            this.$el.find(this.getRowSelector(id)).remove();

            if (
                this.collection.length === 0 &&
                (this.collection.total === 0 || this.collection.total === -2)
            ) {
                this.reRender();
            }
        },

        getTableMinWidth: function () {
            if (!this.listLayout) {
                return;
            }

            var totalWidth = 0;
            var totalWidthPx = 0;
            var emptyCount = 0;
            var columnCount = 0;

            this.listLayout.forEach((item) => {
                columnCount ++;

                if (item.widthPx) {
                    totalWidthPx += item.widthPx;

                    return;
                }

                if (item.width) {
                    totalWidth += item.width;

                    return;
                }

                emptyCount ++;
            });

            if (this.rowActionsView && !this.rowActionsDisabled) {
                totalWidthPx += this.rowActionsColumnWidth;
            }

            if (this.checkboxes) {
                totalWidthPx += this.checkboxColumnWidth;
            }

            var minWidth;

            if (totalWidth >= 100) {
                minWidth = columnCount * this.minColumnWidth;
            }
            else {
                minWidth = (totalWidthPx + this.minColumnWidth * emptyCount) / (1 - totalWidth / 100);
                minWidth = Math.round(minWidth);
            }

            return minWidth;
        },

    });
});
