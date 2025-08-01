﻿/* 

jTable 3.1.5 (edited by Franky Van Liedekerke)
https://www.e-dynamics.be

---------------------------------------------------------------------------

Copyright (C) 2011-2014 by Halil İbrahim Kalkan (http://www.halilibrahimkalkan.com)
Copyright (C) 2025-now by Franky Van Liedekerke (https://www.e-dynamics.be)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

/************************************************************************
 * CORE jTable module                                                    *
 *************************************************************************/
(function ($) {

    let unloadingPage;

    $(window).on('beforeunload', function () {
        unloadingPage = true;
    });
    $(window).on('unload', function () {
        unloadingPage = false;
    });

    jTable = function (element, options) {
        this.element = $(element);
        this.options = $.extend(true, {}, this.options, options);
        this._create();
    }

    jTable.prototype = {
        LOG_LEVELS: {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            NONE: 4
        },
        options: {
            // Options
            tableId: undefined,
            logLevel: 2, // needs to be a constant here, LOG_LEVELS is not in scope of options
            actions: {},
            fields: {},
            animationsEnabled: true,
            defaultDateFormat: 'yy-mm-dd',
            defaultDateLocale: '',
            showCloseButton: false,
            loadingAnimationDelay: 500,
            saveUserPreferences: true,
            saveUserPreferencesMethod: 'localstorage',
            jqueryuiTheme: false,
            unAuthorizedRequestRedirectUrl: null,
            listQueryParams: {},

            ajaxSettings: {
                type: 'POST',
                dataType: 'json'
            },

            toolbar: {
                items: []
            },

            // Functions for events
            closeRequested: function (event, data) { },
            formCreated: function (event, data) { },
            formSubmitting: function (event, data) { },
            formClosed: function (event, data) { },
            loadingRecords: function (event, data) { },
            recordsLoaded: function (event, data) { },
            rowInserted: function (event, data) { },
            rowsRemoved: function (event, data) { },

            // Localization
            messages: {
                serverCommunicationError: 'An error occured while communicating to the server.',
                loadingMessage: 'Loading records...',
                noDataAvailable: 'No data available!',
                areYouSure: 'Are you sure?',
                save: 'Save',
                saving: 'Saving',
                cancel: 'Cancel',
                error: 'Error',
                close: 'Close',
                cannotLoadOptionsFor: 'Can not load options for field {0}'
            }
        },
        /************************************************************************
         * CONSTRUCTOR AND INITIALIZATION METHODS                                *
         *************************************************************************/

        /* Contructor.
         *************************************************************************/
        _create: function () {

            // Initialization
            this._initializeSettings();
            this._createFieldAndColumnList();

            // Needs to be before _loadExtraSettings, so _loadExtraSettings can load the cookie
            // But needs to come after _createFieldAndColumnList
            this._userPrefPrefix = this._generateUserPrefPrefix();            

            // Load optional extra settings for fields
            // This is done before _normalizeFieldsOptions, so that runs all regular code and checks
            this._loadExtraSettings();

            // Normalize field options
            this._normalizeFieldsOptions();

            // Extra actions hook before table gets built
            this._doExtraActions();

            // Creating DOM elements
            this._createMainContainer();
            this._bindEvents();
            this._createTableTitle();
            this._createToolBar();
            this._createTableDiv();
            this._createTable();
            this._createBusyDialog();
            this._createInfoDialog();
            this._createErrorDialog();
            this._addNoDataRow();
        },

        /* Normalizes some options for all fields (sets default values).
         *************************************************************************/
        _normalizeFieldsOptions: function () {
            let self = this;
            $.each(self.options.fields, function (fieldName, props) {
                self._normalizeFieldOptions(fieldName, props);
            });
        },

        /* Normalizes some options for a field (sets default values).
         *************************************************************************/
        _normalizeFieldOptions: function (fieldName, props) {
            if (props.listClassHeader == undefined) {
                props.listClassHeader = '';
            }
            if (props.listClassEntry == undefined) {
                props.listClassEntry = '';
            }
            if (props.listClass == undefined) {
                props.listClass = '';
            }
            if (props.listEscapeHTML == undefined) {
                props.listEscapeHTML = false;
            }
            if (props.inputClass == undefined) {
                props.inputClass = '';
            }
            if (props.inputAttributes == undefined) {
                props.inputAttributes = '';
            }
            if (props.inputEscapeHTML == undefined) {
                props.inputEscapeHTML = false;
            }
            if (props.placeholder == undefined) {
                props.placeholder = '';
            }
            if (props.explain == undefined) {
                props.explain = '';
            }
            if (props.type == undefined) {
                props.type = 'text';
            }
            if (props.dateFormat == undefined && props.displayFormat != undefined) {
                props.dateFormat = props.displayFormat;
            }

            // Convert dependsOn to array if it's a comma seperated list
            if (props.dependsOn && $.type(props.dependsOn) === 'string') {
                let dependsOnArray = props.dependsOn.split(',');
                props.dependsOn = [];
                for (let i = 0; i < dependsOnArray.length; i++) {
                    props.dependsOn.push($.trim(dependsOnArray[i]));
                }
            }
        },

        /* Intializes some private variables.
         ************************************************************************/
        _initializeSettings: function () {
            this._$mainContainer = null; // Reference to the main container of all elements that are created by this plug-in (jQuery object)

            this._$titleDiv = null; // Reference to the title div (jQuery object)
            this._$toolbarDiv = null; // Reference to the toolbar div (jQuery object)

            this._$tableDiv = null; // Reference to the table main div
            this._$table = null; // Reference to the main <table> (jQuery object)
            this._$tableBody = null; // Reference to <body> in the table (jQuery object)
            this._$tableRows = []; // Array of all <tr> in the table (except "no data" row) (jQuery object array)

            this._$busyDialog = null; // Reference to the div that is used to block UI while busy (jQuery object)
            this._$errorDialog = null; // Reference to the error dialog div (jQuery object)
            this._$infoDialog = null; // Reference to the info dialog div (jQuery object)

            this._columnList = []; // Name of all data columns in the table (select column and command columns are not included) (string array)
            this._fieldList = []; // Name of all fields of a record (defined in fields option) (string array)
            this._keyField = null; // Name of the key field of a record (that is defined as 'key: true' in the fields option) (string)

            this._firstDataColumnOffset = 0; // Start index of first record field in table columns (some columns can be placed before first data column, such as select checkbox column) (integer)
            this._lastPostData = {}; // Last posted data on load method (object)

            this._cache = []; // General purpose cache dictionary (object)

            this._extraFieldTypes = [];
        },

        /* Fills _fieldList, _columnList arrays and sets _keyField variable.
         *************************************************************************/
        _createFieldAndColumnList: function () {
            let self = this;

            $.each(self.options.fields, function (name, props) {

                // Add field to the field list
                self._fieldList.push(name);

                // Check if this field is the key field
                if (props.key == true) {
                    self._keyField = name;
                }

                // Add field to column list if it is shown in the table
                if (props.list != false && props.type != 'hidden') {
                    self._columnList.push(name);
                }
            });
        },

        /* Creates the main container div.
         *************************************************************************/
        _createMainContainer: function () {
            this._$mainContainer = $('<div />')
                .addClass('jtable-main-container')
                .appendTo(this.element);

            this._jqueryuiThemeAddClass(this._$mainContainer, 'ui-widget');
        },

        /* Creates title of the table if a title supplied in options.
         *************************************************************************/
        _createTableTitle: function () {
            let self = this;

            if (!self.options.title) {
                return;
            }

            let $titleDiv = $('<div />')
                .addClass('jtable-title')
                .appendTo(self._$mainContainer);

            self._jqueryuiThemeAddClass($titleDiv, 'ui-widget-header');

            $('<div />')
                .addClass('jtable-title-text')
                .appendTo($titleDiv)
                .append(self.options.title);

            if (self.options.showCloseButton) {

                let $textSpan = $('<span />')
                    .html(self.options.messages.close);

                $('<button></button>')
                    .addClass('jtable-command-button jtable-close-button')
                    .attr('title', self.options.messages.close)
                    .append($textSpan)
                    .appendTo($titleDiv)
                    .on("click", function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        self._onCloseRequested();
                    });
            }

            self._$titleDiv = $titleDiv;
        },

        /* Creates the table surrounding div
         *************************************************************************/
        _createTableDiv: function () {
            this._$tableDiv = $('<div />')
                .addClass('jtable-table-div')
                .appendTo(this._$mainContainer);
        },

        /* Creates the table.
         *************************************************************************/
        _createTable: function () {
            this._$table = $('<table></table>')
                .addClass('jtable')
                .appendTo(this._$tableDiv);

            if (this.options.tableId) {
                this._$table.attr('id', this.options.tableId);
            } else if (this._$tableDiv.attr('id')) {
                this._$table.attr('id', 'jtable-' + this._$mainContainer.attr('id'));
            }

            this._jqueryuiThemeAddClass(this._$table, 'ui-widget-content');

            this._createTableHead();
            this._createTableBody();
        },

        /* Creates header (all column headers) of the table.
         *************************************************************************/
        _createTableHead: function () {
            let $thead = $('<thead></thead>')
                .appendTo(this._$table);

            this._addRowToTableHead($thead);
        },

        /* Adds tr element to given thead element
         *************************************************************************/
        _addRowToTableHead: function ($thead) {
            let $tr = $('<tr></tr>')
                .appendTo($thead);

            this._addColumnsToHeaderRow($tr);
        },

        /* Adds column header cells to given tr element.
         *************************************************************************/
        _addColumnsToHeaderRow: function ($tr) {
            for (let i = 0; i < this._columnList.length; i++) {
                let fieldName = this._columnList[i];
                let $headerCell = this._createHeaderCellForField(fieldName, this.options.fields[fieldName]);
                $headerCell.appendTo($tr);
            }
        },

        /* Creates a header cell for given field.
         *  Returns th jQuery object.
         *************************************************************************/
        _createHeaderCellForField: function (fieldName, field) {
            field.width = field.width || '10%'; //default column width: 10%.

            let $headerTextSpan = $('<span />')
                .addClass('jtable-column-header-text')
                .html(field.title);

            let $headerContainerDiv = $('<div />')
                .addClass('jtable-column-header-container')
                .append($headerTextSpan);

            let $th = $('<th></th>')
                .addClass('jtable-column-header')
                .addClass(field.listClass)
                .addClass(field.listClassHeader)
                .css('width', field.width)
                .data('fieldName', fieldName)
                .append($headerContainerDiv);

            if (field.tooltip) {
                $th.prop('title', field.tooltip);
            }

            this._jqueryuiThemeAddClass($th, 'ui-state-default');

            return $th;
        },

        /* Creates an empty header cell that can be used as command column headers.
         *************************************************************************/
        _createEmptyCommandHeader: function (extraclass) {
            let $th = $('<th></th>')
                .addClass('jtable-command-column-header' + ' ' + extraclass)
                .css('width', '1%');

            this._jqueryuiThemeAddClass($th, 'ui-state-default');

            return $th;
        },

        /* Creates tbody tag and adds to the table
         *************************************************************************/
        _createTableBody: function () {
            this._$tableBody = $('<tbody></tbody>').appendTo(this._$table);
        },

        /* Creates a dialov to block UI while jTable is busy
         *************************************************************************/
        _createBusyDialog: function() {
            let self = this;
            // Create overlay
            self._$busyOverlay = $('<div class="jtable-modal-overlay"></div>')
                .prependTo(self._$mainContainer);

            // Create modal
            self._$busyDialog = $('<div class="jtable-modal jtable-busy-modal"></div>')
                .appendTo(self._$busyOverlay);

            self._$busyMessageDiv = $('<div class="jtable-busy-message"></div>')
                .appendTo(self._$busyDialog);
        },

        /* Creates and prepares info dialog
         *************************************************************************/
        _createInfoDialog: function() {
            let self = this;

            // Create overlay
            self._$infoOverlay = $('<div class="jtable-modal-overlay"></div>')
                .prependTo(self._$mainContainer);

            // Create modal
            self._$infoDialog = $('<div class="jtable-modal jtable-info-modal"></div>')
                .appendTo(self._$infoOverlay);

            // Add content
            $('<h2 class="jtable-modal-header"></h2>')
                .html(self.options.messages.info)
                .appendTo(self._$infoDialog);

            $('<div class="jtable-modal-body"><p><span class="jtable-info-message"></span></p></div>')
                .appendTo(self._$infoDialog);

            $('<div class="jtable-modal-footer"></div>')
                .append(
                    $('<button type="button" class="jtable-dialog-button jtable-dialog-closebutton"></button>')
                    .html('<span>' + self.options.messages.close + '</span>')
                    .on('click', function() {
                        self._closeInfoDialog();
                    })
                )
                .appendTo(self._$infoDialog);

            // initially closed
            self._closeInfoDialog();
        },

        _closeInfoDialog: function() {
            this._$infoOverlay.hide();
        },

        /* Creates and prepares error dialog
         *************************************************************************/
        _createErrorDialog: function() {
            let self = this;

            // Create overlay
            self._$errorOverlay = $('<div class="jtable-modal-overlay"></div>')
                .prependTo(self._$mainContainer);

            // Create modal
            self._$errorDialog = $('<div class="jtable-modal jtable-error-modal"></div>')
                .appendTo(self._$errorOverlay);

            // Add content
            $('<h2 class="jtable-modal-header"></h2>')
                .html(self.options.messages.error)
                .appendTo(self._$errorDialog);

            $('<div class="jtable-modal-body"><p><span class="jtable-error-message"></span></p></div>')
                .appendTo(self._$errorDialog);

            $('<div class="jtable-modal-footer"></div>')
                .append(
                    $('<button type="button" class="jtable-dialog-button jtable-dialog-closebutton"></button>')
                    .html('<span>' + self.options.messages.close + '</span>')
                    .on('click', function() {
                        self._closeErrorDialog();
                    })
                )
                .appendTo(self._$errorDialog);

            // Close button
            $('<span class="jtable-modal-close">&times;</span>')
                .on('click', function() {
                    self._closeErrorDialog();
                })
                .appendTo(self._$errorDialog);

            // initially closed
            self._closeErrorDialog();
        },

        _closeErrorDialog: function() {
            this._$errorOverlay.hide();
        },

        /************************************************************************
         * PUBLIC METHODS                                                        *
         *************************************************************************/

        /* Loads data using AJAX call, clears table and fills with new data.
         *************************************************************************/
        load: function (extraPostData, completeCallback) {
            let listQueryParams = typeof this.options.listQueryParams === "function"
                ? this.options.listQueryParams()
                : this.options.listQueryParams;

            // use spread operator to merge
            this._lastPostData = { ...listQueryParams, ...(extraPostData || {}) };

            this._reloadTable(completeCallback);
        },

        /* Refreshes (re-loads) table data with last postData.
         *************************************************************************/
        reload: function (completeCallback) {
            this._reloadTable(completeCallback);
        },

        /* Gets a jQuery row object according to given record key
         *************************************************************************/
        getRowByKey: function (key) {
            for (let i = 0; i < this._$tableRows.length; i++) {
                if (key == this._getKeyValueOfRecord(this._$tableRows[i].data('record'))) {
                    return this._$tableRows[i];
                }
            }

            return null;
        },

        /* Completely removes the table from it's container.
         *************************************************************************/
        destroy: function () {
            this._$table.off;
            this.element.empty();
            //$.Widget.prototype.destroy.call(this);
        },

        /* Reset table to original state
         *************************************************************************/
        resetTable: function () {
            this.destroy();
            this._create();
            this.load();
        },

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* Used to change options dynamically after initialization.
         *************************************************************************/
        _setOption: function (key, value) {
        },

        /* Used by extensions to load additional settings from cookies or so
         *************************************************************************/
        _loadExtraSettings: function() {
        },

        /* Used by extensions to execute additional actions before table build is done
         *************************************************************************/
        _doExtraActions: function() {
        },

        /* LOADING RECORDS  *****************************************************/

        /* Performs an AJAX call to reload data of the table.
         *************************************************************************/
        _reloadTable: function (completeCallback) {
            let self = this;

            let completeReload = function(data) {
                self._hideBusy();

                // Show the error message if server returns error
                if (data.Result != 'OK') {
                    self._showError(data.Message);
                    return;
                }

                // Re-generate table rows
                self._removeAllRows('reloading');
                self._addRecordsToTable(data.Records);

                self._onRecordsLoaded(data);

                // Call complete callback
                if (completeCallback) {
                    completeCallback();
                }
            };

            self._showBusy(self.options.messages.loadingMessage, self.options.loadingAnimationDelay); // Disable table since it's busy
            self._onLoadingRecords();

            // listAction may be a function, check if it is
            if (typeof self.options.actions.listAction === "function") {
                // Execute the function
                let funcResult = self.options.actions.listAction(self._lastPostData, self._createJtParamsForLoading());

                // Check if result is a jQuery Deferred object
                if (self._isDeferredObject(funcResult)) {
                    funcResult.done(function(data) {
                        completeReload(data);
                    }).fail(function() {
                        self._showError(self.options.messages.serverCommunicationError);
                    }).always(function() {
                        self._hideBusy();
                    });
                } else { // assume it's the data we're loading
                    completeReload(funcResult);
                }

            } else { // assume listAction as URL string.

                // Generate URL (with query string parameters) to load records
                /* let loadUrl = self._createRecordLoadUrl(); */
                let loadUrl = self.options.actions.listAction;
                let extraparams = self._createJtParamsForLoading();

                // Load data from server using AJAX
                self._ajax({
                    url: loadUrl,
                    data: { ...self._lastPostData, ...extraparams},
                    success: function (data) {
                        completeReload(data);
                    },
                    error: function () {
                        self._hideBusy();
                        self._showError(self.options.messages.serverCommunicationError);
                    }
                });

            }
        },

        /* Creates URL to load records.
         *************************************************************************/
        /*_createRecordLoadUrl: function () {
            return this.options.actions.listAction;
        },*/

        _createJtParamsForLoading: function() {
            return {
                // Empty as default, extensions can override this method to add additional params to load request
            };
        },

        /* TABLE MANIPULATION METHODS *******************************************/

        /* Creates a row from given record
         *************************************************************************/
        _createRowFromRecord: function (record) {
            let $tr = $('<tr></tr>')
                .addClass('jtable-data-row')
                .attr('data-record-key', this._getKeyValueOfRecord(record))
                .data('record', record);

            this._addCellsToRowUsingRecord($tr);
            return $tr;
        },

        /* Adds all cells to given row.
         *************************************************************************/
        _addCellsToRowUsingRecord: function ($row) {
            let record = $row.data('record');
            for (let i = 0; i < this._columnList.length; i++) {
                this._createCellForRecordField(record, this._columnList[i])
                    .appendTo($row);
            }
        },

        /* Create a cell for given field.
         *************************************************************************/
        _createCellForRecordField: function (record, fieldName) {
            return $('<td></td>')
                .addClass(this.options.fields[fieldName].listClass)
                .addClass(this.options.fields[fieldName].listClassEntry)
                .append((this._getDisplayTextForRecordField(record, fieldName)));
        },

        /* Adds a list of records to the table.
         *************************************************************************/
        _addRecordsToTable: function (records) {
            let self = this;

            $.each(records, function (index, record) {
                self._addRowToTable(self._createRowFromRecord(record));
            });

            self._refreshRowStyles();
        },

        /* Adds a single row to the table.
         *************************************************************************/
        _addRowToTable: function ($row, options) {
            // Set defaults
            options = $.extend({
                index: this._$tableRows.length,
                isNewRow: false,
                animationsEnabled: this.options.animationsEnabled
            }, options);

            // Remove 'no data' row if this is first row
            if (this._$tableRows.length <= 0) {
                this._removeNoDataRow();
            }

            // Add new row to the table according to it's index
            options.index = this._normalizeNumber(options.index, 0, this._$tableRows.length, this._$tableRows.length);
            if (options.index == this._$tableRows.length) {
                // add as last row
                this._$tableBody.append($row);
                this._$tableRows.push($row);
            } else if (options.index == 0) {
                // add as first row
                this._$tableBody.prepend($row);
                this._$tableRows.unshift($row);
            } else {
                // insert to specified index
                this._$tableRows[options.index - 1].after($row);
                this._$tableRows.splice(options.index, 0, $row);
            }

            this._onRowInserted($row, options.isNewRow);

            // Show animation if needed
            if (options.isNewRow) {
                this._refreshRowStyles();
                if (options.animationsEnabled) {
                    this._showNewRowAnimation($row);
                }
            }
        },

        /* Shows created animation for a table row
         * TODO: Make this animation cofigurable and changable
         *************************************************************************/
        _showNewRowAnimation: function ($tableRow) {
            let className = 'jtable-row-created';
            if (this.options.jqueryuiTheme) {
                className = className + ' ui-state-highlight';
            }

            $tableRow.addClass(className);

            // Wait 5 seconds, then remove the class
            setTimeout(function () {
                $tableRow.removeClass(className);
            }, 5000);

        },

        /* Removes a row or rows (jQuery selection) from table.
         *************************************************************************/
        _removeRowsFromTable: function ($rows, reason) {
            let self = this;

            // Check if any row specified
            if ($rows.length <= 0) {
                return;
            }

            // remove from DOM
            $rows.addClass('jtable-row-removed').remove();

            // remove from _$tableRows array
            $rows.each(function () {
                let index = self._findRowIndex($(this));
                if (index >= 0) {
                    self._$tableRows.splice(index, 1);
                }
            });

            self._onRowsRemoved($rows, reason);

            // Add 'no data' row if all rows removed from table
            if (self._$tableRows.length == 0) {
                self._addNoDataRow();
            }

            self._refreshRowStyles();
        },

        /* Finds index of a row in table.
         *************************************************************************/
        _findRowIndex: function ($row) {
            return this._findIndexInArray($row, this._$tableRows, function ($row1, $row2) {
                return $row1.data('record') == $row2.data('record');
            });
        },

        /* Removes all rows in the table and adds 'no data' row.
         *************************************************************************/
        _removeAllRows: function (reason) {
            //If no rows does exists, do nothing
            if (this._$tableRows.length <= 0) {
                return;
            }

            // Select all rows (to pass it on raising _onRowsRemoved event)
            let $rows = this._$tableBody.find('tr.jtable-data-row');

            // Remove all rows from DOM and the _$tableRows array
            this._$tableBody.empty();
            this._$tableRows = [];

            this._onRowsRemoved($rows, reason);

            // Add 'no data' row since we removed all rows
            this._addNoDataRow();
        },

        /* Adds "no data available" row to the table.
         *************************************************************************/
        _addNoDataRow: function () {
            if (this._$tableBody.find('>tr.jtable-no-data-row').length > 0) {
                return;
            }

            let $tr = $('<tr></tr>')
                .addClass('jtable-no-data-row')
                .appendTo(this._$tableBody);

            let totalColumnCount = this._$table.find('thead th').length;
            $('<td></td>')
                .attr('colspan', totalColumnCount)
                .html(this.options.messages.noDataAvailable)
                .appendTo($tr);
        },

        /* Removes "no data available" row from the table.
         *************************************************************************/
        _removeNoDataRow: function () {
            this._$tableBody.find('.jtable-no-data-row').remove();
        },

        /* Refreshes styles of all rows in the table
         *************************************************************************/
        _refreshRowStyles: function () {
            for (let i = 0; i < this._$tableRows.length; i++) {
                if (i % 2 == 0) {
                    this._$tableRows[i].addClass('jtable-row-even');
                } else {
                    this._$tableRows[i].removeClass('jtable-row-even');
                }
            }
        },

        /* RENDERING FIELD VALUES ***********************************************/

        /* Gets text for a field of a record according to it's type.
         *************************************************************************/
        _getDisplayTextForRecordField: function (record, fieldName) {
            let field = this.options.fields[fieldName];
            let fieldValue = record[fieldName];
            let extraFieldType = this._findItemByProperty(this._extraFieldTypes, 'type', field.type);

            let displayText = '';
            // if this is a custom field, call display function
            if (field.display) {
                displayText = field.display({ record: record });
            } else if (extraFieldType && extraFieldType.creator) {
                displayText = extraFieldType.creator(record, field);
            } else if (field.type == 'date') {
                displayText = this._getDisplayTextForDateRecordField(field, fieldValue);
            } else if (field.type == 'datetime-local') {
                displayText = this._getDisplayTextForDateTimeRecordField(field, fieldValue);
            } else if (field.type == 'checkbox') {
                displayText = this._getCheckBoxTextForFieldByValue(fieldName, fieldValue);
            } else if (field.options) { // combobox or radio button list since there are options.
                let options = this._getOptionsForField(fieldName, {
                    record: record,
                    value: fieldValue,
                    source: 'list',
                    dependedValues: this._createDependedValuesUsingRecord(record, field.dependsOn)
                });
                displayText = this._findOptionByValue(options, fieldValue).DisplayText;
            } else { // other types
                displayText = fieldValue;
            }
            if (field.listEscapeHTML) {
                return this._escapeHTML(displayText);
            } else {
                return displayText;
            }
        },

        /* Creates and returns an object that's properties are dependent values of a record.
         *************************************************************************/
        _createDependedValuesUsingRecord: function (record, dependsOn) {
            if (!dependsOn) {
                return {};
            }

            let dependedValues = {};
            for (let i = 0; i < dependsOn.length; i++) {
                dependedValues[dependsOn[i]] = record[dependsOn[i]];
            }

            return dependedValues;
        },

        /* Finds an option object by given value.
         *************************************************************************/
        _findOptionByValue: function (options, value) {
            return this._findItemByProperty(options, 'Value', value);
        },

        /* Finds an option object by given value.
         *************************************************************************/
        _findItemByProperty: function (items, key, value) {
            for (let i = 0; i < items.length; i++) {
                if (items[i][key] == value) {
                    return items[i];
                }
            }

            return {}; // no item found
        },

        /* Gets text for a date field.
         *************************************************************************/
        _getDisplayTextForDateRecordField: function (field, fieldValue) {
            if (!fieldValue) {
                return '';
            }

            let date = this._parseDate(fieldValue);
            let dateLocale = field.dateLocale || this.options.defaultDateLocale;
            if (typeof $.fn.fdatepicker == 'function') {
                let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                return $.fn.fdatepicker.formatDate(date, dateFormat, {language: dateLocale});
            } else if (typeof $.fn.flatpickr == 'function') {
                let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                return flatpickr.formatDate(date, dateFormat, { locale: dateLocale });
            } else if (typeof $.fn.datepicker == 'function') {
                let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                if (dateLocale && $.datepicker.regional[dateLocale]) {
                    $.datepicker.setDefaults($.datepicker.regional[dateLocale]);
                }
                return $.datepicker.formatDate(dateFormat, date);
            } else {
                return date.toLocaleDateString(dateLocale,{ year: "numeric", month: "2-digit", day: "2-digit" });
            }
        },

        /* Gets text for a date field.
         *************************************************************************/
        _getDisplayTextForDateTimeRecordField: function (field, fieldValue) {
            if (!fieldValue) {
                return '';
            }

            let date = this._parseDate(fieldValue);
            let dateLocale = field.dateLocale || this.options.defaultDateLocale;
            if (typeof $.fn.fdatepicker == 'function') {
                let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                return $.fn.fdatepicker.formatDate(date, dateFormat, {language: dateLocale});
            } else if (typeof $.fn.flatpickr == 'function') {
                let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                return flatpickr.formatDate(date, dateFormat, { locale: dateLocale });
            } else if (typeof $.fn.datepicker == 'function') {
                let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                if (dateLocale && $.datepicker.regional[dateLocale]) {
                    $.datepicker.setDefaults($.datepicker.regional[dateLocale]);
                }
                return $.datepicker.formatDate(dateFormat, date);
            } else {
                return date.toLocaleString(dateLocale);
            }
        },

        /* Gets options for a field according to user preferences.
         *************************************************************************/
        _getOptionsForField: function (fieldName, funcParams, fieldSource='options') {
            let field = this.options.fields[fieldName];
            //let optionsSource = field.options;
            let optionsSource = field[fieldSource];

            if (typeof optionsSource === "function") {
                // prepare parameter to the function
                funcParams = $.extend(true, {
                    _cacheCleared: false,
                    dependedValues: {},
                    clearCache: function () {
                        this._cacheCleared = true;
                    }
                }, funcParams);

                // call function and get actual options source
                optionsSource = optionsSource(funcParams);
            }

            let options;

            // Build options according to it's source type
            if (typeof optionsSource == 'string') { // It is an Url to download options
                let cacheKey = 'options_' + fieldName + '_' + optionsSource; // create a unique cache key
                if (funcParams._cacheCleared || (!this._cache[cacheKey])) {
                    // if user calls clearCache() or options are not found in the cache, download options
                    this._cache[cacheKey] = this._buildOptionsFromArray(this._downloadOptions(fieldName, optionsSource));
                    this._sortFieldOptions(this._cache[cacheKey], field.optionsSorting);
                } else {
                    // found on cache..
                    // if this method (_getOptionsForField) is called to get option for a specific value (on funcParams.source == 'list')
                    // and this value is not in cached options, we need to re-download options to get the unfound (probably new) option.
                    if (funcParams.value != undefined) {
                        let optionForValue = this._findOptionByValue(this._cache[cacheKey], funcParams.value);
                        if (optionForValue.DisplayText == undefined) { // this value is not in cached options...
                            this._cache[cacheKey] = this._buildOptionsFromArray(this._downloadOptions(fieldName, optionsSource));
                            this._sortFieldOptions(this._cache[cacheKey], field.optionsSorting);
                        }
                    }
                }

                options = this._cache[cacheKey];
            } else if (Array.isArray(optionsSource)) { // It is an array of options
                options = this._buildOptionsFromArray(optionsSource);
                this._sortFieldOptions(options, field.optionsSorting);
            } else { // It is an object that it's properties are options
                options = this._buildOptionsArrayFromObject(optionsSource);
                this._sortFieldOptions(options, field.optionsSorting);
            }

            return options;
        },

        /* Download options for a field from server.
         *************************************************************************/
        _downloadOptions: function (fieldName, url) {
            let self = this;
            let options = [];

            self._ajax({
                url: url,
                async: false,
                success: function (data) {
                    if (data.Result != 'OK') {
                        self._showError(data.Message);
                        return;
                    }

                    options = data.Options;
                },
                error: function () {
                    let errMessage = self._formatString(self.options.messages.cannotLoadOptionsFor, fieldName);
                    self._showError(errMessage);
                }
            });

            return options;
        },

        /* Sorts given options according to sorting parameter.
         *  sorting can be: 'value', 'value-desc', 'text' or 'text-desc'.
         *************************************************************************/
        _sortFieldOptions: function (options, sorting) {

            if ((!options) || (!options.length) || (!sorting)) {
                return;
            }

            // Determine using value or text
            let dataSelector;
            if (sorting.startsWith('value')) {
                dataSelector = function (option) {
                    return option.Value;
                };
            } else { // assume as text
                dataSelector = function (option) {
                    return option.DisplayText;
                };
            }

            // simple isNumeric function
            let isNumeric = function (value) {
                return !isNaN(value) && !isNaN(parseFloat(value));
            };
            let compareFunc;
            if (isNumeric(dataSelector(options[0]))) {
                // assume the option values are numeric
                compareFunc = function (option1, option2) {
                    return dataSelector(option1) - dataSelector(option2);
                };
            } else {
                // assume the option values are strings, so do stringcompare
                compareFunc = function (option1, option2) {
                    return dataSelector(option1).localeCompare(dataSelector(option2));
                };
            }

            if (sorting.includes('desc')) {
                options.sort(function (a, b) {
                    return compareFunc(b, a);
                });
            } else { // assume as asc
                options.sort(function (a, b) {
                    return compareFunc(a, b);
                });
            }
        },

        /* Creates an array of options from given object.
         *************************************************************************/
        _buildOptionsArrayFromObject: function (options) {
            let list = [];

            $.each(options, function (propName, propValue) {
                list.push({
                    Value: propName,
                    DisplayText: propValue
                });
            });

            return list;
        },

        /* Creates array of options from giving options array.
         *************************************************************************/
        _buildOptionsFromArray: function (optionsArray) {
            let list = [];

            for (let i = 0; i < optionsArray.length; i++) {
                if ($.isPlainObject(optionsArray[i])) {
                    list.push(optionsArray[i]);
                } else { // assumed as primitive type (int, string...)
                    list.push({
                        Value: optionsArray[i],
                        DisplayText: optionsArray[i]
                    });
                }
            }

            return list;
        },

        /* Parses given date string to a javascript Date object.
         *  Given string must be formatted one of the samples shown below:
         *  /Date(1320259705710)/
         *  2011-01-01 20:32:42 (YYYY-MM-DD HH:MM:SS)
         *  2011-01-01 (YYYY-MM-DD)
         *************************************************************************/
        _parseDate: function (dateString) {
            if (dateString.includes('Date')) { // Format: /Date(1320259705710)/
                return new Date(
                    parseInt(dateString.substr(6), 10)
                );
            } else if (dateString.length == 10) { // Format: 2011-01-01
                return new Date(
                    parseInt(dateString.substr(0, 4), 10),
                    parseInt(dateString.substr(5, 2), 10) - 1,
                    parseInt(dateString.substr(8, 2), 10)
                );
            } else if (dateString.length == 19) { // Format: 2011-01-01 20:32:42
                return new Date(
                    parseInt(dateString.substr(0, 4), 10),
                    parseInt(dateString.substr(5, 2), 10) - 1,
                    parseInt(dateString.substr(8, 2), 10),
                    parseInt(dateString.substr(11, 2), 10),
                    parseInt(dateString.substr(14, 2), 10),
                    parseInt(dateString.substr(17, 2), 10)
                );
            } else {
                this._logWarn('Given date is not properly formatted: ' + dateString);
                return 'format error!';
            }
        },

        /* TOOL BAR *************************************************************/

        /* Creates the toolbar.
         *************************************************************************/
        _createToolBar: function () {
            this._$toolbarDiv = $('<div />')
                .addClass('jtable-toolbar')
                .appendTo(this._$titleDiv);

            for (let i = 0; i < this.options.toolbar.items.length; i++) {
                this._addToolBarItem(this.options.toolbar.items[i]);
            }
        },

        /* Adds a new item to the toolbar.
         *************************************************************************/
        _addToolBarItem: function (item) {

            // Check if item is valid
            if (item == undefined || item.text == undefined) {
                this._logWarn('Can not add tool bar item since it is not valid!');
                this._logWarn(item);
                return null;
            }

            if (item.icon == undefined) {
                item.icon = false;
            }

            let $toolBarItem = $('<span></span>')
                .addClass('jtable-toolbar-item')
                .appendTo(this._$toolbarDiv);

            this._jqueryuiThemeAddClass($toolBarItem, 'ui-widget ui-state-default ui-corner-all', 'ui-state-hover');

            // id property
            if (item.id) {
                $toolBarItem
                    .attr('id', item.id);
            }

            // cssClass property
            if (item.cssClass) {
                $toolBarItem
                    .addClass(item.cssClass);
            }

            // tooltip property
            if (item.tooltip) {
                $toolBarItem
                    .attr('title', item.tooltip);
            }

            // icon property
            if (item.icon) {
                let $icon = $('<span class="jtable-toolbar-item-icon"></span>').appendTo($toolBarItem);
                if (item.icon === true) {
                    // do nothing
                } else if ($.type(item.icon) === 'string') {
                    $icon.css('background', 'url("' + item.icon + '")');
                }
            }

            // text property
            if (item.text) {
                $('<span class=""></span>')
                    .html(item.text)
                    .addClass('jtable-toolbar-item-text').appendTo($toolBarItem);
            }

            // click event ("click" is a function defined for the item in the options list, not a triggered jquery event)
            if (item.click) {
                $toolBarItem.on("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    item.click(); // call the defined function
                });
            }

            // change class on hover
            $toolBarItem.hover(function () {
                $toolBarItem.addClass('jtable-toolbar-item-hover');
            }, function () {
                $toolBarItem.removeClass('jtable-toolbar-item-hover');
            });

            return $toolBarItem;
        },

        /* ERROR DIALOG *********************************************************/

        /* Shows error message dialog with given message.
         *************************************************************************/
        _showError: function(message) {
            this._$errorDialog.find(".jtable-error-message").html(message);
            this._$errorOverlay.show();
        },

        /* Shows info message dialog with given message.
         *************************************************************************/
        _showInfo: function(message) {
            this._$infoDialog.find(".jtable-info-message").html(message);
            this._$infoOverlay.show();
        },

        /* BUSY PANEL ***********************************************************/

        /* Shows busy indicator and blocks table UI.
         * TODO: Make this cofigurable and changable
         *************************************************************************/
        _setBusyTimer: null,
        _showBusy: function(message, delay) {
            let self = this;
            let makeVisible = function() {
                self._$busyMessageDiv.html(message);
                self._$busyOverlay.show();
            };

            if (delay) {
                if (self._setBusyTimer) {
                    return;
                }
                self._setBusyTimer = setTimeout(makeVisible, delay);
            } else {
                makeVisible();
            }
        },

        /* Hides busy indicator and unblocks table UI.
         *************************************************************************/
        _hideBusy: function() {
            clearTimeout(this._setBusyTimer);
            this._setBusyTimer = null;
            this._$busyOverlay.hide();
        },

        /* Returns true if jTable is busy.
         *************************************************************************/
        _isBusy: function () {
            return this._$busyDialog.is(':visible');
        },

        /* Adds jQueryUI class to an item.
         *************************************************************************/
        _jqueryuiThemeAddClass: function ($elm, className, hoverClassName) {
            if (!this.options.jqueryuiTheme) {
                return;
            }

            $elm.addClass(className);

            if (hoverClassName) {
                $elm.hover(function () {
                    $elm.addClass(hoverClassName);
                }, function () {
                    $elm.removeClass(hoverClassName);
                });
            }
        },

        /* COMMON METHODS *******************************************************/

        _unAuthorizedRequestHandler: function() {
            if (this.options.unAuthorizedRequestRedirectUrl) {
                location.href = this.options.unAuthorizedRequestRedirectUrl;
            } else {
                location.reload(true);
            }
        },

        /* This method is used to perform AJAX calls in jTable instead of direct
         * usage of jQuery.ajax method.
         *************************************************************************/
        _ajax: function (options) {
            let self = this;

            // Handlers for HTTP status codes
            let opts = {
                statusCode: {
                    401: function () { // Unauthorized
                        self._unAuthorizedRequestHandler();
                    }
                }
            };

            opts = $.extend(opts, this.options.ajaxSettings, options);

            // Override success
            opts.success = function (data) {
                // Checking for Authorization error
                if (data && data.UnAuthorizedRequest == true) {
                    self._unAuthorizedRequestHandler();
                }

                if (options.success) {
                    options.success(data);
                }
            };

            // Override error
            opts.error = function (jqXHR, textStatus, errorThrown) {
                if (unloadingPage) {
                    jqXHR.abort();
                    return;
                }

                if (options.error) {
                    if (jqXHR && jqXHR.responseText) {
                        let responseText = jqXHR.responseText.trim();
                        self._logDebug(responseText);
                    }
                    options.error(arguments);
                }
            };

            // Override complete
            opts.complete = function () {
                if (options.complete) {
                    options.complete();
                }
            };

            $.ajax(opts);
        },

        /* Gets value of key field of a record.
         *************************************************************************/
        _getKeyValueOfRecord: function (record) {
            return record[this._keyField];
        },

        /************************************************************************
         * COOKIE                                                                *
         *************************************************************************/

        /* Sets a cookie with given key.
         *************************************************************************/
        _setUserPref: function (key, value) {
            key = this._userPrefPrefix + key;

            if (this.options.saveUserPreferencesMethod == 'cookie') {
                let expireDate = new Date();
                expireDate.setDate(expireDate.getDate() + 30);
                Cookies.set(key, value, { expires: expireDate });
            } else {
                localStorage.setItem(key,value);
            }
            return null;
        },

        /* Gets a cookie with given key.
         *************************************************************************/
        _getUserPref: function (key) {
            key = this._userPrefPrefix + key;

            if (this.options.saveUserPreferencesMethod == 'cookie') {
                return Cookies.get(key);
            } else {
                return localStorage.getItem(key);
            }
        },

        /* Remove a cookie with given key.
         *************************************************************************/
        _removeUserPref: function (key) {
            key = this._userPrefPrefix + key;
            if (this.options.saveUserPreferencesMethod == 'cookie') {
                Cookies.remove(key);
            } else {
                localStorage.removeItem(key);
            }
            return null;
        },

        /* Generates a hash key to be prefix for all cookies for this jtable instance.
         *************************************************************************/
        _generateUserPrefPrefix: function () {

            let simpleHash = function (value) {
                let hash = 0;
                if (value.length == 0) {
                    return hash;
                }

                for (let i = 0; i < value.length; i++) {
                    let ch = value.charCodeAt(i);
                    hash = ((hash << 5) - hash) + ch;
                    hash = hash & hash;
                }

                return hash;
            };

            let strToHash = '';
            if (this.options.tableId) {
                strToHash = this.options.tableId + '#';
            }

            //strToHash = strToHash + this._columnList.join('$') + '#c' + this._$table.find('thead th').length;
            strToHash = strToHash + this._columnList.join('$') + '#c' + this.options.fields.length;
            return 'jtable#' + simpleHash(strToHash);
        },

        /************************************************************************
         * EVENT BIND and RAISING METHODS                                                 *
         *************************************************************************/
        _bindEvents: function() {
            // Bind the events
            this._$mainContainer.on("closeRequested", this.options.closeRequested);
            this._$mainContainer.on("formCreated", this.options.formCreated);
            this._$mainContainer.on("formSubmitting", this.options.formSubmitting);
            this._$mainContainer.on("formClosed", this.options.formClosed);
            this._$mainContainer.on("loadingRecords", this.options.loadingRecords);
            this._$mainContainer.on("recordsLoaded", this.options.recordsLoaded);
            this._$mainContainer.on("rowInserted", this.options.rowInserted);
            this._$mainContainer.on("rowsRemoved", this.options.rowsRemoved);

            // from the extensions, but lets keep things simple and add all events here ...
            this._$mainContainer.on("recordAdded", this.options.recordAdded);
            this._$mainContainer.on("rowUpdated", this.options.rowUpdated);
            this._$mainContainer.on("recordUpdated", this.options.recordUpdated);
            this._$mainContainer.on("recordDeleted", this.options.recordDeleted);
            this._$mainContainer.on("selectionChanged", this.options.selectionChanged);
        },

        _onLoadingRecords: function () {
            this._$mainContainer.trigger("loadingRecords", {});
        },

        _onRecordsLoaded: function (data) {
            this._$mainContainer.trigger("recordsLoaded", { records: data.Records, serverResponse: data });
        },

        _onRowInserted: function ($row, isNewRow) {
            this._$mainContainer.trigger("rowInserted", { row: $row, record: $row.data('record'), isNewRow: isNewRow });
        },

        _onRowsRemoved: function ($rows, reason) {
            this._$mainContainer.trigger("rowsRemoved", { rows: $rows, reason: reason });
        },

        _onCloseRequested: function () {
            this._$mainContainer.trigger("closeRequested", {});
        }

    };

    $.fn.jtable = function (methodOrOptions) {
        let options = {};
        let methodOrOptionsType = typeof methodOrOptions;
        // Determine if the first argument is a string (a function method) or an object (a list of options)
        if (methodOrOptionsType === 'string') {
            // no private functions allowed, we default to just "load" then
            if (methodOrOptions.startsWith('_')) {
                methodOrOptions = "load";
            } else {
                // If it's a method, set options to extra arguments if provided
                options = Array.prototype.slice.call(arguments, 1);
            }
        } else {
            // If it's an object (= a list of options), set options to methodOrOptions
            options = methodOrOptions;
        }

        let res;
        this.each(function () {
            // check the instance state
            let myinstance = $(this).data('jtable');
            if (!myinstance) {
                // no state yet, so call a new jTable with the options and save the instance state in jTable-data
                if (methodOrOptionsType !== 'object') {
                    methodOrOptions = {};
                }
                const instance = new jTable(this, methodOrOptions);
                $(this).data('jtable', instance);  // to make the instance public accessible via .data('jtable')
                res = instance;
            } else {
                // there is an instance, so here we only allow to continue if a method is called
                if (methodOrOptionsType === 'string') {
                    // Check if the method exists on the instance
                    if (myinstance && typeof myinstance[methodOrOptions] === 'function') {
                        // Call the method with the provided options
                        res = myinstance[methodOrOptions].apply(myinstance, options);
                    } else {
                        // Handle the case where the method does not exist
                        res = $.error('Method ' + methodOrOptions + ' does not exist on jtable');
                    }
                } else {
                    res = $.error('Incorrect call to jtable');
                }
            }
            // we return after the first match in the each (we only do 1 element matching the selector)
            // we can't return res here, since that would return it to the function-call of this.each,
            // we need it to return res to the caller of jtable
            // this return just stops the this.each loop
            return;
        });
        return res;
    };

}(jQuery));

(function ($) {

    $.extend(true, jTable.prototype, {
        /* Gets property value of an object recursively.
         *************************************************************************/
        _getPropertyOfObject: function (obj, propName) {
            if (propName.includes('.')) {
                return obj[propName];
            } else {
                let preDot = propName.substring(0, propName.indexOf('.'));
                let postDot = propName.substring(propName.indexOf('.') + 1);
                return this._getPropertyOfObject(obj[preDot], postDot);
            }
        },

        /* Sets property value of an object recursively.
         *************************************************************************/
        _setPropertyOfObject: function (obj, propName, value) {
            if (propName.includes('.')) {
                obj[propName] = value;
            } else {
                let preDot = propName.substring(0, propName.indexOf('.'));
                let postDot = propName.substring(propName.indexOf('.') + 1);
                this._setPropertyOfObject(obj[preDot], postDot, value);
            }
        },

        /* Inserts a value to an array if it does not exists in the array.
         *************************************************************************/
        _insertToArrayIfDoesNotExists: function (array, value) {
            if ($.inArray(value, array) < 0) {
                array.push(value);
            }
        },

        /* Finds index of an element in an array according to given comparision function
         *************************************************************************/
        _findIndexInArray: function (value, array, compareFunc) {

            // If not defined, use default comparision
            if (!compareFunc) {
                compareFunc = function (a, b) {
                    return a == b;
                };
            }

            for (let i = 0; i < array.length; i++) {
                if (compareFunc(value, array[i])) {
                    return i;
                }
            }

            return -1;
        },

        /* Normalizes a number between given bounds or sets to a defaultValue
         *  if it is undefined
         *************************************************************************/
        _normalizeNumber: function (number, min, max, defaultValue) {
            if (number == undefined || number == null || isNaN(number)) {
                return defaultValue;
            }

            if (number < min) {
                return min;
            }

            if (number > max) {
                return max;
            }

            return number;
        },

        _roundNumber: function (number) {
            //const roundedNumber = Math.round(number*1000)/1000;
            //return roundedNumber;
            return number;
        },

        /* Formats a string just like string.format in c#.
         *  Example:
         *  _formatString('Hello {0}','Halil') = 'Hello Halil'
         *************************************************************************/
        _formatString: function () {
            if (arguments.length == 0) {
                return null;
            }

            let str = arguments[0];
            for (let i = 1; i < arguments.length; i++) {
                let placeHolder = '{' + (i - 1) + '}';
                str = str.replace(placeHolder, arguments[i]);
            }

            return str;
        },

        /* Checks if given object is a jQuery Deferred object.
        */
        _isDeferredObject: function (obj) {
            return obj.then && obj.done && obj.fail;
        },

        // HTML escape function
        _escapeHTML: function (text) {
            if (!text) {
                return text;
            }
            let map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };

            return text.replace(/[&<>"']/g, function(m) { return map[m]; });
        },

        // Logging methods
        _log: function (level, text) {
            if (!window.console || typeof this.options.logLevel === 'undefined') {
                return;
            }

            let currentLevel = this.options.logLevel;
            // If logLevel is a string, convert it
            if (typeof currentLevel === 'string') {
                currentLevel = this.LOG_LEVELS[currentLevel.toUpperCase()] ?? this.LOG_LEVELS.ERROR;
            }

            if (level < currentLevel) {
                return;
            }

            const levelStr = Object.keys(this.LOG_LEVELS).find(key => this.LOG_LEVELS[key] === level);
            const prefix = `jTable ${levelStr}:`;

            console.log(`${prefix} ${text}`);
        },

        _logDebug: function (text) {
            this._log(this.LOG_LEVELS.DEBUG, text);
        },

        _logInfo: function (text) {
            this._log(this.LOG_LEVELS.INFO, text);
        },

        _logWarn: function (text) {
            this._log(this.LOG_LEVELS.WARN, text);
        },

        _logError: function (text) {
            this._log(this.LOG_LEVELS.ERROR, text);
        }

    });

})(jQuery);


/************************************************************************
 * FORMS extension for jTable (base for edit/create forms)               *
 *************************************************************************/
(function ($) {

    $.extend(true, jTable.prototype, {

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* Submits a form asynchronously using AJAX.
         *  This method is needed, since form submitting logic can be overrided
         *  by extensions.
         *************************************************************************/
        _submitFormUsingAjax: function (url, formData, success, error) {
            this._ajax({
                url: url,
                data: formData,
                success: success,
                error: error,
                contentType: false,
                processData: false,
                type: 'POST',
                dataType: 'json'
            });
        },

        /* Creates label for an input element.
         *************************************************************************/
        _createInputLabelForRecordField: function (fieldName) {
            // TODO: May create label tag instead of a div.
            return $('<div />')
                .addClass('jtable-input-label')
                .html(this.options.fields[fieldName].inputTitle || this.options.fields[fieldName].title);
        },

        /* Creates an input element according to field type.
         *************************************************************************/
        _createInputForRecordField: function (funcParams) {
            let fieldName = funcParams.fieldName,
                value = funcParams.value,
                record = funcParams.record,
                formType = funcParams.formType,
                form = funcParams.form;

            // Get the field
            let field = this.options.fields[fieldName];

            // If value if not supplied, use defaultValue of the field
            if (value == undefined || value == null) {
                value = field.defaultValue;
            }

            let inputres ;
            // Create input according to field type
            if (field.type == 'date') {
                inputres = this._createDateInputForField(field, fieldName, value);
            } else if (field.type == 'textarea') {
                inputres = this._createTextAreaForField(field, fieldName, value);
            } else if (field.type == 'checkbox') {
                inputres = this._createCheckboxForField(field, fieldName, value);
            } else if (field.options) {
                if (field.type == 'datalist') {
                    inputres = this._createDataListForField(field, fieldName, value, record, formType);
                } else if (field.type == 'radiobutton') {
                    inputres = this._createRadioButtonListForField(field, fieldName, value, record, formType);
                } else {
                    inputres = this._createDropDownListForField(field, fieldName, value, record, formType, form);
                }
            } else {
                if (field.type == 'file') {
                    inputres = this._createInputForField(field, fieldName, '');
                } else {
                    inputres = this._createInputForField(field, fieldName, value);
                }
            }

            // Use custom function if supplied
            if (field.input) {
                let $input = $(field.input({
                    value: value,
                    record: record,
                    formType: formType,
                    form: form,
                    inputField: inputres // we add the rendered input field too
                }));

                // Add id attribute if does not exists
                if (!$input.attr('id')) {
                    $input.attr('id', 'Edit-' + fieldName);
                }

                // Wrap input element with div
                return $('<div />')
                    .addClass('jtable-input jtable-custom-input')
                    .append($input);
            }

            // no custom function, then we return the original input
            return inputres;

        },

        // Creates a hidden input element with given name and value.
        _createInputForHidden: function (fieldName, value) {
            if (value == undefined) {
                value = "";
            }

            return $('<input type="hidden" name="' + fieldName + '" id="Edit-' + fieldName + '"></input>')
                .val(value);
        },

        /* Creates a date input for a field.
         *************************************************************************/
        _createDateInputForField: function (field, fieldName, value) {
            let $input;
            if (typeof $.fn.fdatepicker == 'function') {
                let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                let dateLocale = field.dateLocale || this.options.defaultDateLocale;
                $input = $('<div>');

                // Create hidden input
                let $hiddenInput = $('<input>', {
                    id: 'real-' + fieldName,
                    type: 'hidden',
                    name: fieldName
                });

                // Create visible input
                let $visibleInput = $('<input>', {
                    class: field.inputClass,
                    id: 'Edit-' + fieldName,
                    type: 'text',
                    name: 'alt-' + fieldName,
                    attr: field.inputAttributes
                });

                // Append both inputs to container
                $input.append($hiddenInput, $visibleInput);

                // Initialize datepicker on the visible input
                $visibleInput.fdatepicker({
                    autoClose: true,
                    todayButton: new Date(),
                    clearButton: true,
                    closeButton: true,
                    language: dateLocale,
                    dateFormat: dateFormat,
                    altFieldDateFormat: 'Y-m-d',
                    altField: '#real-' + fieldName  // This should point to the hidden input's ID
                });
                if (value != undefined) {
                    $hiddenInput.val(value);
                    $visibleInput.data('fdatepicker').selectDate(value);
                }
            } else if (typeof $.fn.flatpickr == 'function') {
                let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                let dateLocale = field.dateLocale || this.options.defaultDateLocale;

                // Create a container to ensure Flatpickr has a parent to work with
                $input = $('<div>');

                // Single input (Flatpickr will convert this to hidden and create its own altInput)
                let $mainInput = $('<input>', {
                    id: 'real-' + fieldName,
                    name: fieldName,
                    class: field.inputClass,
                    type: 'text',  // Flatpickr will change this to 'hidden'
                    attr: field.inputAttributes
                });

                $input.append($mainInput);

                // Initialize Flatpickr
                let fp = flatpickr($mainInput, {
                    dateFormat: 'Y-m-d',  // Actual format stored in the input
                    altInput: true,       // Enables the alternate visible input
                    altFormat: dateFormat,
                    locale: dateLocale
                });

                if (value != undefined) {
                    fp.setDate(value);
                }

            } else if (typeof $.fn.datepicker == 'function') {
                let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                let dateLocale = field.dateLocale || this.options.defaultDateLocale;
                $input = $('<div>');

                // Create hidden input
                let $hiddenInput = $('<input>', {
                    id: 'real-' + fieldName,
                    type: 'hidden',
                    name: fieldName
                });

                // Create visible input
                let $visibleInput = $('<input>', {
                    class: field.inputClass,
                    id: 'Edit-' + fieldName,
                    type: 'text',
                    name: 'alt-' + fieldName,
                    attr: field.inputAttributes
                });

                // Append both inputs to container
                $input.append($hiddenInput, $visibleInput);

                // Initialize datepicker on the visible input
                if (dateLocale && $.datepicker.regional[dateLocale]) {
                    $.datepicker.setDefaults($.datepicker.regional[dateLocale]);
                }
                $visibleInput.datepicker({
                    dateFormat: dateFormat,
                    altFormat: 'Y-m-d',
                    altField: '#real-' + fieldName  // This should point to the hidden input's ID
                });
                if (value != undefined) {
                    $hiddenInput.val(value);
                    $visibleInput.val(new Date(value));
                }
            } else {
                $input = $('<input class="' + field.inputClass + '" id="Edit-' + fieldName + '" type="date" name="' + fieldName + '"' + field.inputAttributes + '></input>');
                if (value != undefined) {
                    $input.val(value);
                }
            }

            let $containerDiv = $('<div />')
                .addClass('jtable-input jtable-date-input')
                .append($input);
            if (field.explain) {
                $containerDiv.append($('<br><span><small>' + field.explain + '</small></span>'));
            }
            return $containerDiv;
        },

        /* Creates a textarea element for a field.
         *************************************************************************/
        _createTextAreaForField: function (field, fieldName, value) {
            let $textArea = $('<textarea class="' + field.inputClass + '" id="Edit-' + fieldName + '" name="' + fieldName + '"' + field.inputAttributes + '></textarea>');
            if (value != undefined) {
                $textArea.val(value);
            }

            let $containerDiv = $('<div />')
                .addClass('jtable-input jtable-textarea-input')
                .append($textArea);
            if (field.explain) {
                $containerDiv.append($('<br><span><small>' + field.explain + '</small></span>'));
            }
            return $containerDiv;
        },

        /* Creates any type input for a field (text/password/range/week/datetime-local/...).
         *************************************************************************/
        _createInputForField: function (field, fieldName, value) {
            let $input;

            if (field.inputAttributes.toLowerCase().includes("multiple") ) {
                $input = $('<input class="' + field.inputClass + '" placeholder="' + field.placeholder + '" id="Edit-' + fieldName + '" type="' + field.type + '" name="' + fieldName + '[]"' + field.inputAttributes + '></input>');
            } else {
                $input = $('<input class="' + field.inputClass + '" placeholder="' + field.placeholder + '" id="Edit-' + fieldName + '" type="' + field.type + '" name="' + fieldName + '"' + field.inputAttributes + '></input>');
            }

            if (value != undefined) {
                $input.val(value);
            }
            // prevent form submit on enter, but trigger change
            $input.on("keypress", function (event) {
                let keyPressed = event.keyCode || event.which;
                if (keyPressed === 13) {
                    event.preventDefault();
                    $input.trigger('change');
                    return false;
                }
            });

            let $containerDiv = $('<div />')
                .addClass('jtable-input jtable-' + field.inputClass + '-input')
                .append($input);
            if (field.explain) {
                $containerDiv.append($('<br><span><small>' + field.explain + '</small></span>'));
            }
            return $containerDiv;
        },

        /* Creates a checkboxfor a field.
         *************************************************************************/
        _createCheckboxForField: function (field, fieldName, value) {
            let self = this;

            // If value is undefined, get unchecked state's value
            if (value == undefined) {
                value = self._getCheckBoxPropertiesForFieldByState(fieldName, false).Value;
            }

            // Create a container div
            let $containerDiv = $('<div />')
                .addClass('jtable-input jtable-checkbox-input');

            // Create checkbox and check if needed
            let $checkBox = $('<input class="' + field.inputClass + '" id="Edit-' + fieldName + '" type="checkbox" name="' + fieldName + '"' + field.inputAttributes + ' />')
                .appendTo($containerDiv);
            if (value != undefined) {
                $checkBox.val(value);
            }

            // Create display text of checkbox for current state
            let $textSpan = $('<span>' + (field.formText || self._getCheckBoxTextForFieldByValue(fieldName, value)) + '</span>')
                .appendTo($containerDiv);

            // Check the checkbox if it's value is checked-value
            if (self._getIsCheckBoxSelectedForFieldByValue(fieldName, value)) {
                $checkBox.prop('checked', true);
            }

            // This method sets checkbox's value and text according to state of the checkbox
            let refreshCheckBoxValueAndText = function () {
                let checkboxProps = self._getCheckBoxPropertiesForFieldByState(fieldName, $checkBox.prop('checked'));
                $checkBox.attr('value', checkboxProps.Value);
                $textSpan.html(field.formText || checkboxProps.DisplayText);
            };

            // Register to click event to change display text when state of checkbox is changed.
            $checkBox.on("click", function () {
                refreshCheckBoxValueAndText();
            });

            // Change checkbox state when clicked to text
            if (field.setOnTextClick != false) {
                $textSpan
                    .addClass('jtable-option-text-clickable')
                    .on("click", function () {
                        if ($checkBox.prop('checked')) {
                            $checkBox.prop('checked', false);
                        } else {
                            $checkBox.prop('checked', true);
                        }

                        refreshCheckBoxValueAndText();
                    });
            }

            if (field.explain) {
                $containerDiv.append($('<br><span><small>' + field.explain + '</small></span>'));
            }

            return $containerDiv;
        },

        /* Creates a drop down list (combobox) input element for a field.
         *************************************************************************/
        _createDropDownListForField: function (field, fieldName, value, record, source, form) {

            // Create a container div
            let $containerDiv = $('<div />')
                .addClass('jtable-input jtable-dropdown-input');

            // Create select element
            let $select = $('<select class="' + field.inputClass + '" id="Edit-' + fieldName + '" name="' + fieldName + '"' + field.inputAttributes + '></select>')
                .appendTo($containerDiv);

            // add options
            let options = this._getOptionsForField(fieldName, {
                record: record,
                source: source,
                form: form,
                dependedValues: this._createDependedValuesUsingForm(form, field.dependsOn)
            });

            this._fillDropDownListWithOptions($select, options, value);

            if (field.explain) {
                $containerDiv.append($('<br><span><small>' + field.explain + '</small></span>'));
            }

            return $containerDiv;
        },

        /* Fills a dropdown list with given options.
         *************************************************************************/
        _fillDropDownListWithOptions: function ($select, options, value) {
            $select.empty();
            for (let i = 0; i < options.length; i++) {
                let $option = $('<option>')
                    .val(options[i].Value)
                    .text(options[i].DisplayText);
                
                // Voeg data-attributen toe als ze bestaan
                if (options[i].Data) {
                    for (let key in options[i].Data) {
                        $option.attr('data-' + key, options[i].Data[key]);
                    }
                }
                
                // Selecteer de juiste optie
                if (options[i].Value == value) {
                    $option.prop('selected', true);
                }
                
                $select.append($option);
            }
        },

        /* Creates depended values object from given form.
         *************************************************************************/
        _createDependedValuesUsingForm: function ($form, dependsOn) {
            if (!dependsOn) {
                return {};
            }

            let dependedValues = {};

            for (let i = 0; i < dependsOn.length; i++) {
                let dependedField = dependsOn[i];

                let $dependsOn = $form.find('[name=' + dependedField + ']');
                if ($dependsOn.length <= 0) {
                    continue;
                }

                dependedValues[dependedField] = $dependsOn.val();
            }


            return dependedValues;
        },

        /* Creates a datalist for a field.
         *************************************************************************/
        _createDataListForField: function (field, fieldName, value, record, source) {
            let $containerDiv = $('<div />')
                .addClass('jtable-input jtable-datalist-input');

            // Create the input element
            let $input = $('<input type="text" list="' + fieldName + '-list" />')
                .attr('name', fieldName)
                .attr('id', 'Edit-' + fieldName)
                .addClass(field.inputClass)
                .attr(field.inputAttributes || {})
                .val(value)
                .appendTo($containerDiv);

            // Create the datalist element
            let $datalist = $('<datalist id="' + fieldName + '-list"></datalist>')
                .appendTo($containerDiv);

            // Get options for the field
            let options = this._getOptionsForField(fieldName, {
                record: record,
                source: source
            });

            // Add options to the datalist
            $.each(options, function(i, option) {
                $('<option />')
                    .val(option.Value)
                    .text(option.DisplayText)
                    .appendTo($datalist);
            });

            return $containerDiv;
        },
        /* Creates a radio button list for a field.
         *************************************************************************/
        _createRadioButtonListForField: function (field, fieldName, value, record, source) {
            let $containerDiv = $('<div />')
                .addClass('jtable-input jtable-radiobuttonlist-input');

            let options = this._getOptionsForField(fieldName, {
                record: record,
                source: source
            });

            for (let i = 0; i < options.length; i++) {
                let $radioButtonDiv = $('<div class=""></div>')
                    .addClass('jtable-radio-input')
                    .appendTo($containerDiv);

                let $radioButton = $('<input type="radio" id="Edit-' + fieldName + '-' + i + '" class="' + field.inputClass + '" name="' + fieldName + '"' + field.inputAttributes + ((options[i].Value == (value + '')) ? ' checked="true"' : '') + ' />')
                    .val(options[i].Value)
                    .appendTo($radioButtonDiv);

                // Voeg data-attributen toe als ze bestaan
                if (options[i].Data) {
                    for (let key in options[i].Data) {
                        $radioButton.attr('data-' + key, options[i].Data[key]);
                    }
                }

                let $textSpan = $('<span></span>')
                    .html(option.DisplayText)
                    .appendTo($radioButtonDiv);

                if (field.setOnTextClick != false) {
                    $textSpan
                        .addClass('jtable-option-text-clickable')
                        .on("click", function () {
                            if (!$radioButton.prop('checked')) {
                                $radioButton.prop('checked', true);
                            }
                        });
                }
            }

            return $containerDiv;
        },

        /* Gets display text for a checkbox field.
         *************************************************************************/
        _getCheckBoxTextForFieldByValue: function (fieldName, value) {
            return this.options.fields[fieldName].values[value];
        },

        /* Returns true if given field's value must be checked state.
         *************************************************************************/
        _getIsCheckBoxSelectedForFieldByValue: function (fieldName, value) {
            return (this._createCheckBoxStateArrayForFieldWithCaching(fieldName)[1].Value.toString() == value.toString());
        },

        /* Gets an object for a checkbox field that has Value and DisplayText
         *  properties.
         *************************************************************************/
        _getCheckBoxPropertiesForFieldByState: function (fieldName, checked) {
            return this._createCheckBoxStateArrayForFieldWithCaching(fieldName)[(checked ? 1 : 0)];
        },

        /* Calls _createCheckBoxStateArrayForField with caching.
         *************************************************************************/
        _createCheckBoxStateArrayForFieldWithCaching: function (fieldName) {
            let cacheKey = 'checkbox_' + fieldName;
            if (!this._cache[cacheKey]) {

                this._cache[cacheKey] = this._createCheckBoxStateArrayForField(fieldName);
            }

            return this._cache[cacheKey];
        },

        /* Creates a two element array of objects for states of a checkbox field.
         *  First element for unchecked state, second for checked state.
         *  Each object has two properties: Value and DisplayText
         *************************************************************************/
        _createCheckBoxStateArrayForField: function (fieldName) {
            let stateArray = [];
            let currentIndex = 0;
            $.each(this.options.fields[fieldName].values, function (propName, propValue) {
                if (currentIndex++ < 2) {
                    stateArray.push({ 'Value': propName, 'DisplayText': propValue });
                }
            });

            return stateArray;
        },

        /* Searches a form for dependend dropdowns and makes them cascaded.
        */
        _makeCascadeDropDowns: function ($form, record, source) {
            let self = this;

            $form.find('select') //f or each combobox
                .each(function () {
                    let $thisDropdown = $(this);

                    // get field name
                    let fieldName = $thisDropdown.attr('name');
                    if (!fieldName) {
                        return;
                    }

                    let field = self.options.fields[fieldName];

                    // check if this combobox depends on others
                    if (!field.dependsOn) {
                        return;
                    }

                    // for each dependency
                    $.each(field.dependsOn, function (index, dependsOnField) {
                        // find the depended combobox
                        let $dependsOnField = $form.find('[name=' + dependsOnField + ']');
                        // when depended combobox changes
                        $dependsOnField.change(function () {

                            // Refresh options
                            let funcParams = {
                                record: record,
                                source: source,
                                form: $form,
                                dependedValues: {}
                            };
                            funcParams.dependedValues = self._createDependedValuesUsingForm($form, field.dependsOn);
                            let options = self._getOptionsForField(fieldName, funcParams);

                            // Fill combobox with new options
                            self._fillDropDownListWithOptions($thisDropdown, options, undefined);

                            // Trigger change event to refresh multi cascade dropdowns.
                            $thisDropdown.change();
                        });
                    });
                });
        },

        /* Updates values of a record from given form
         *************************************************************************/
        _updateRecordValuesFromForm: function (record, $form) {
            for (let i = 0; i < this._fieldList.length; i++) {
                let fieldName = this._fieldList[i];
                let field = this.options.fields[fieldName];

                // Do not update non-editable fields
                if (field.edit == false) {
                    continue;
                }

                // Get field name and the input element of this field in the form
                let $inputElement = $form.find('[name="' + fieldName + '"]');
                if ($inputElement.length <= 0) {
                    continue;
                }

                // Update field in record according to it's type
                if (field.options && field.type == 'radiobutton') {
                    let $checkedElement = $inputElement.filter(':checked');
                    if ($checkedElement.length) {
                        record[fieldName] = $checkedElement.val();
                    } else {
                        record[fieldName] = undefined;
                    }
                } else {
                    record[fieldName] = $inputElement.val();
                }
            }
        },

        /* Sets enabled/disabled state of a dialog button.
         *************************************************************************/
        _setEnabledOfDialogButton: function ($button, enabled, buttonText) {
            if (!$button) {
                return;
            }

            if (enabled != false) {
                $button.removeAttr('disabled');
                if (this.options.jqueryuiTheme) {
                    $button.removeClass('ui-state-disabled');
                }
            } else {
                $button.attr('disabled', 'disabled');
                if (this.options.jqueryuiTheme) {
                    $button.addClass('ui-state-disabled');
                }
            }

            if (buttonText) {
                $button
                    .find('span')
                    .text(buttonText);
            }
        }

    });

})(jQuery);


/************************************************************************
 * CSV toolbar extension for jTable                                    *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        _create: jTable.prototype._create
    };

    // extension members
    $.extend(true, jTable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {
            csvName: '',
            csvDelimiter: ';',

            // Localization
            messages: {
                csvExport: 'CSV'
            }
        },

        /************************************************************************
         * CONSTRUCTOR AND INITIALIZING METHODS                                  *
         *************************************************************************/

        /* Overrides base method to do create-specific constructions.
         *************************************************************************/
        _create: function () {
            base._create.apply(this, arguments);

            if (!this.options.csvExport) {
                return;
            }

            this._csvExportAction();
        },

        /* Creates and prepares add new record dialog div
         *************************************************************************/
        _csvExportAction: function () {
            let self = this;

            if (self.options.csvExportButton) {
                // If user supplied a button, bind the click event to show dialog form
                self.options.csvTableButton.on("click", function (e) {
                    e.preventDefault();
                    self._csvExportTable();
                });
            } else {
                // If user did not supply a button, create a 'add record button' toolbar item.
                self._addToolBarItem({
                    icon: false,
                    cssClass: 'jtable-toolbar-item-csv-table',
                    id: 'jtable-toolbar-item-csv-table',
                    text: self.options.messages.csvExport,
                    click: function () {
                        self._csvExportTable();
                    }
                });
            }
        },

        _csvExportTable: function () {
            let self = this;

            const newTable = self._$table.clone();
            const csvName = self.options.csvName || self.options.title || document.title;

            let csvData = [];

            //header
            // th - remove attributes and header divs from jTable
            // newTable.find('th').each(function () {
            let tmpRow = []; // construct header available array
            $.each(newTable.find('th'),function () {
                if ($(this).hasClass('jtable-command-column-header')) {
                    return;
                }
                if ($(this).css('display') != 'none') { // don't check for visible here, since the table is a clone that won't work
                    let val = $(this).find('.jtable-column-header-text').text();
                    tmpRow[tmpRow.length] = self._formatCSV(val);
                }
            });
            csvData[csvData.length] = tmpRow.join(self.options.csvDelimiter);

            // tr - remove attributes
            //newTable.find('tr').each(function () {
            $.each(newTable.find('tr'),function () {
                let tmpRow = [];
                $.each($(this).find('td'),function() {
                    if ($(this).hasClass('jtable-command-column')) {
                        return;
                    }
                    if ($(this).css('display') != 'none') { // don't check for visible here, since the table is a clone that won't work
                        if ($(this).find('img').length || $(this).find('button').length) {
                            $(this).html('');
                        }
                        // we take the html and replace br
                        let val = $(this).html();
                        let regexp = new RegExp(/\<br ?\/?\>/g);
                        val = val.replace(regexp, '\n');
                        $(this).html(val);
                        tmpRow[tmpRow.length] = self._formatCSV($(this).text());
                    }
                });
                if (tmpRow.length>0) {
                    csvData[csvData.length] = tmpRow.join(self.options.csvDelimiter);
                }
            });

            // we create a link and click on it.
            // window.open-call to 'data:' fails on some browsers due to security limitations with the
            //    error: "Not allowed to navigate top frame to data URL 'data:text/csv;charset=utf8...."
            let mydata = '\uFEFF' + csvData.join('\r\n'); // Add BOM at the beginning
            let blob = new Blob([mydata], { type: 'text/csv;charset=utf-8' });
            let link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = csvName+'_data.csv'; // Specify the file name
            link.click();
            link.remove();
        },

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* format CSV
         *************************************************************************/
        _formatCSV: function (inputLine) {
            // double " according to rfc4180
            let regexp = new RegExp(/["]/g);
            let output = inputLine.replace(regexp, '""');
            //HTML
            regexp = new RegExp(/\<[^\<]+\>/g);
            output = output.replace(regexp, "");
            output = output.replace(/&nbsp;/gi,' '); //replace &nbsp;
            if (output == "") return '';
            return '"' + output.trim() + '"';
        }

    });

})(jQuery);


/************************************************************************
 * PRINT toolbar extension for jTable                                    *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        _create: jTable.prototype._create
    };

    // extension members
    $.extend(true, jTable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {
            printMode: 'iframe', // 'popup' or 'iframe'
            printExtraStyles: '', // extra custom CSS
 
            // Localization
            messages: {
                printTable: '🖨️ Print'
            }
        },

        /************************************************************************
         * CONSTRUCTOR AND INITIALIZING METHODS                                  *
         *************************************************************************/

        /* Overrides base method to do create-specific constructions.
         *************************************************************************/
        _create: function () {
            base._create.apply(this, arguments);

            if (!this.options.printTable) {
                return;
            }

            this._printTableAction();
        },

        /* Creates and prepares add new record dialog div
         *************************************************************************/
        _printTableAction: function () {
            let self = this;

            if (self.options.printTableButton) {
                // If user supplied a button, bind the click event to show dialog form
                self.options.printTableButton.on("click", function (e) {
                    e.preventDefault();
                    self._printTable();
                });
            } else {
                // If user did not supply a button, create a 'add record button' toolbar item.
                self._addToolBarItem({
                    icon: false,
                    cssClass: 'jtable-toolbar-item-print-table',
                    id: 'jtable-toolbar-item-print-table',
                    text: self.options.messages.printTable,
                    click: function () {
                        self._printTable();
                    }
                });
            }
        },

        _printTable: function () {
            let self = this;

            const tableHtml = self._$table.clone().wrap('<div>').parent().html();
            const printTitle = self.options.title || document.title;
            const fullHtml = `
<html>
<head>
    <title>${printTitle}</title>
    <style>
        body { font-family: sans-serif; padding: 10px; }
        table { width: 100%; border-collapse: collapse; }
        table, th, td { border: 1px solid black; }
	    .jtable-command-column-header { display: none; }
	    .jtable-command-column { display: none; }
        ${self.options.printExtraStyles}
    </style>
    <base href="${window.location.href}">
</head>
<body>
    ${tableHtml}
    <script>
        window.onload = function() {
            window.focus();
            window.print();
        };
    </script>
</body>
</html>
`;

            if (self.options.printMode === 'popup') {
                const printWindow = window.open('', '_blank', 'width=800,height=600');
                if (!printWindow) {
                    alert('Popup blocked! Please allow popups for this site.');
                    return false;
                }

                printWindow.document.open();
                printWindow.document.write(fullHtml);
                printWindow.document.close();

                setTimeout(() => {
                    try {
                        printWindow.close();
                    } catch (e) {
                        console.warn('Could not close print window:', e);
                    }
                }, 1000);

            } else if (self.options.printMode === 'iframe') {
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                iframe.src = 'about:blank';

                document.body.appendChild(iframe);

                try {
                    const iframeWindow = iframe.contentWindow || iframe;
                    const iframeDoc = iframeWindow.document;

                    iframeDoc.open();
                    iframeDoc.write(fullHtml);
                    iframeDoc.close();

                    setTimeout(() => {
                        document.body.removeChild(iframe);
                    }, 100);
                } catch (e) {
                    console.error('Print failed:', e);
                    document.body.removeChild(iframe);
                    return false;
                }
            }
        }

    });

})(jQuery);


/************************************************************************
 * CREATE RECORD extension for jTable                                    *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        _initializeSettings: jTable.prototype._initializeSettings,
        _create: jTable.prototype._create
    };

    // extension members
    $.extend(true, jTable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {

            // Events
            recordAdded: function (event, data) { },

            // Localization
            messages: {
                addNewRecord: 'Add new record'
            }
        },

        /************************************************************************
         * CONSTRUCTOR AND INITIALIZING METHODS                                  *
         *************************************************************************/

        /* Overrides _initializeSettings method
         *************************************************************************/
        _initializeSettings: function () {
            base._initializeSettings.apply(this, arguments);
            this._$addRecordDialog = null; // Reference to the adding new record dialog div (jQuery object)
        },

        /* Overrides base method to do create-specific constructions.
         *************************************************************************/
        _create: function () {
            base._create.apply(this, arguments);

            if (!this.options.actions.createAction) {
                return;
            }

            this._createAddRecordDialog();
        },

        /* Creates and prepares add new record dialog div
         *************************************************************************/
        _createAddRecordDialog: function () {
            let self = this;

            // Create overlay
            self._$addRecordOverlay = $('<div class="jtable-modal-overlay"></div>')
                .prependTo(self._$mainContainer);

            // Create modal
            self._$addRecordDialog = $('<div class="jtable-modal jtable-add-modal"></div>')
                .appendTo(self._$addRecordOverlay);

            $('<h2 class="jtable-modal-header" id="addRecordDialogTitle"></h2>')
                .text(self.options.messages.addNewRecord)
                .appendTo(self._$addRecordDialog);

            const $cancelButton = $('<button type="button" class="jtable-dialog-button jtable-dialog-cancelbutton"></button>')
                .html('<span>' + self.options.messages.cancel + '</span>')
                .on('click', function () {
                    self._closeCreateForm();
                });

            let $saveButton = $('<button type="button" class="jtable-dialog-button jtable-dialog-savebutton"></button>')
                .html('<span>' + self.options.messages.save + '</span>')
                .on('click', function () {
                    self._onSaveClickedOnCreateForm();
                });

            $('<div class="jtable-modal-footer"></div>')
                .append($cancelButton, $saveButton)
                .appendTo(self._$addRecordDialog);

            // Close button
            $('<span class="jtable-modal-close">&times;</span>')
                .on('click', function() {
                    self._closeCreateForm();
                })
                .appendTo(self._$addRecordDialog);
	    
	     // initially closed
             self._closeCreateForm();

		if (self.options.addRecordButton) {
			// If user supplied a button, bind the click event to show dialog form
			self.options.addRecordButton.on("click", function (e) {
				e.preventDefault();
				self._showAddRecordForm();
			});
		} else {
			// If user did not supply a button, create a 'add record button' toolbar item.
			self._addToolBarItem({
				icon: true,
				cssClass: 'jtable-toolbar-item-add-record',
				id: 'jtable-toolbar-item-add-record',
				text: self.options.messages.addNewRecord,
				click: function () {
					self._showAddRecordForm();
				}
			});
		}

        },

        _onSaveClickedOnCreateForm: function () {
            let self = this;

            let $addRecordForm = self._$addRecordDialog.find('form').first();
            // since the form is submitted via ajax, the validy of fields is not checked, we force it here
            if ($addRecordForm[0].checkValidity()) {
                let $saveButton = self._$addRecordDialog.find('#AddRecordDialogSaveButton');

                if (self._$mainContainer.trigger("formSubmitting", { form: $addRecordForm, formType: 'create' }) != false) {
                    self._setEnabledOfDialogButton($saveButton, false, self.options.messages.saving);
                    self._saveAddRecordForm($addRecordForm, $saveButton);
                }
                self._closeCreateForm();
            } else {
                $addRecordForm[0].reportValidity();
            }
        },

        _closeCreateForm: function () {
            this._$addRecordOverlay.hide();
            this._$mainContainer.trigger("formClosed", { form: this._$addRecordDialog.find('form').first(), formType: 'create' });
        },

        /************************************************************************
         * PUBLIC METHODS                                                        *
         *************************************************************************/

        /* Shows add new record dialog form.
         *************************************************************************/
        showCreateForm: function () {
            this._showAddRecordForm();
        },

        /* Public API: Adds a new record to the table (optionally to the server also)
         *************************************************************************/
        addRecord: function (options) {
            let self = this;

            options = $.extend({
                clientOnly: false,
                animationsEnabled: self.options.animationsEnabled,
                success: function () { },
                error: function () { }
            }, options);

            if (!options.record) {
                self._logWarn('options parameter in addRecord method must contain a record property.');
                return;
            }

            if (options.clientOnly) {
                self._addRowToTable(
                    self._createRowFromRecord(options.record), {
                        isNewRow: true,
                        animationsEnabled: options.animationsEnabled
                    });

                options.success();
                return;
            }

            let completeAddRecord = function (data) {
                if (data.Result != 'OK') {
                    self._showError(data.Message);
                    options.error(data);
                    return;
                }

                if (!data.Record) {
                    self._logError('Server must return the created Record object.');
                    options.error(data);
                    return;
                }

                self._onRecordAdded(data);
                self._addRowToTable(
                    self._createRowFromRecord(data.Record), {
                        isNewRow: true,
                        animationsEnabled: options.animationsEnabled
                    });

                options.success(data);
            };

            // createAction may be a function, check if it is
            if (!options.url && typeof self.options.actions.createAction === "function") {

                // Execute the function
                let funcResult = self.options.actions.createAction($.param(options.record));

                // Check if result is a jQuery Deferred object
                if (self._isDeferredObject(funcResult)) {
                    // Wait promise
                    funcResult.done(function (data) {
                        completeAddRecord(data);
                    }).fail(function () {
                        self._showError(self.options.messages.serverCommunicationError);
                        options.error();
                    });
                } else { // assume it returned the creation result
                    completeAddRecord(funcResult);
                }

            } else { // Assume it's a URL string

                // Make an Ajax call to create record
                self._submitFormUsingAjax(
                    options.url || self.options.actions.createAction,
                    $.param(options.record),
                    function (data) {
                        completeAddRecord(data);
                    },
                    function () {
                        self._showError(self.options.messages.serverCommunicationError);
                        options.error();
                    });

            }
        },

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* Shows add new record dialog form.
         *************************************************************************/
        _showAddRecordForm: function () {
            let self = this;

            // Create add new record form
            let $addRecordForm = $('<form id="jtable-create-form" class="jtable-dialog-form jtable-create-form"></form>');

            // Create input elements
            for (let i = 0; i < self._fieldList.length; i++) {

                let fieldName = self._fieldList[i];
                let field = self.options.fields[fieldName];

                // Do not create input for fields that is key and not specially marked as creatable
                if (field.key == true && field.create != true) {
                    continue;
                }

                // Do not create input for fields that are not creatable
                if (field.create == false) {
                    continue;
                }

                if (field.type == 'hidden') {
                    $addRecordForm.append(self._createInputForHidden(fieldName, field.defaultValue));
                    continue;
                }

                // Create a container div for this input field and add to form
                let $fieldContainer = $('<div />')
                    .addClass('jtable-input-field-container')
                    .attr('id', 'jtable-input-field-container-div-' + fieldName)
                    .appendTo($addRecordForm);

                // Create a label for input
                $fieldContainer.append(self._createInputLabelForRecordField(fieldName));

                // Create input element
                $fieldContainer.append(
                    self._createInputForRecordField({
                        fieldName: fieldName,
                        formType: 'create',
                        form: $addRecordForm
                    }));
            }

            self._makeCascadeDropDowns($addRecordForm, undefined, 'create');

            $addRecordForm.submit(function () {
                self._onSaveClickedOnCreateForm();
                return false;
            });

            // Remove any existing form
            self._$addRecordDialog.find('form').first().remove();

            // Make sure people can click on the save button
            let $saveButton = self._$addRecordDialog.find('#AddRecordDialogSaveButton');
            self._setEnabledOfDialogButton($saveButton, true, self.options.messages.save);

            // Show the form
            self._$addRecordDialog.find('#addRecordDialogTitle').first().after($addRecordForm);
            self._$addRecordOverlay.show();
            self._$mainContainer.trigger("formCreated", { form: $addRecordForm, formType: 'create' });
        },

        /* Saves new added record to the server and updates table.
         *************************************************************************/
        _saveAddRecordForm: function ($addRecordForm, $saveButton) {
            let self = this;

            let completeAddRecord = function (data) {
                if (data.Result != 'OK') {
                    self._showError(data.Message);
                    return;
                }

                if (!data.Record) {
                    self._logError('Server must return the created Record object.');
                    return;
                }

                self._onRecordAdded(data);
                self._addRowToTable(
                    self._createRowFromRecord(data.Record), {
                        isNewRow: true
                    });
                self._closeCreateForm();
            };

            // $addRecordForm.data('submitting', true); //TODO: Why it's used, can remove? Check it.

            // createAction may be a function, check if it is
            if (typeof self.options.actions.createAction === "function") {

                // Execute the function
                let funcResult = self.options.actions.createAction($addRecordForm.serialize());

                // Check if result is a jQuery Deferred object
                if (self._isDeferredObject(funcResult)) {
                    // Wait promise
                    funcResult.done(function (data) {
                        completeAddRecord(data);
                    }).fail(function () {
                        self._showError(self.options.messages.serverCommunicationError);
                    });
                } else { // assume it returned the creation result
                    completeAddRecord(funcResult);
                }

            } else { // Assume it's a URL string

                // Make an Ajax call to create record
                self._submitFormUsingAjax(
                    self.options.actions.createAction,
                    new FormData($addRecordForm[0]),
                    function (data) {
                        completeAddRecord(data);
                    },
                    function () {
                        self._showError(self.options.messages.serverCommunicationError);
                    });
            }
        },

        _onRecordAdded: function (data) {
            if (data.Message) {
                this._showInfo(data.Message);
            }
            this._$mainContainer.trigger("recordAdded", { record: data.Record, serverResponse: data });
        }

    });

})(jQuery);


/************************************************************************
 * EDIT RECORD extension for jTable                                      *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        _initializeSettings: jTable.prototype._initializeSettings,
        _create: jTable.prototype._create,
        _addColumnsToHeaderRow: jTable.prototype._addColumnsToHeaderRow,
        _addCellsToRowUsingRecord: jTable.prototype._addCellsToRowUsingRecord
    };

    // extension members
    $.extend(true, jTable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {

            // Functions for events
            recordUpdated: function (event, data) { },
            rowUpdated: function (event, data) { },

            // Localization
            messages: {
                editRecord: 'Edit Record'
            }
        },


        /************************************************************************
         * CONSTRUCTOR AND INITIALIZATION METHODS                                *
         *************************************************************************/

        /* Overrides _initializeSettings method
         *************************************************************************/
        _initializeSettings: function () {
            base._initializeSettings.apply(this, arguments);
            this._$editRecordDialog = null; // Reference to the editing dialog div (jQuery object)
            this._$editingRow = null; // Reference to currently editing row (jQuery object)
        },

        /* Overrides base method to do editing-specific constructions.
         *************************************************************************/
        _create: function () {
            base._create.apply(this, arguments);

            // Check if updateAction is supplied
            if (!this.options.actions.updateAction) {
                return;
            }

            this._createEditRecordDialog();
        },

        /* Creates and prepares edit dialog div
         *************************************************************************/
        _createEditRecordDialog: function () {
            let self = this;

            // Create overlay
            self._$editRecordOverlay = $('<div class="jtable-modal-overlay"></div>')
                .prependTo(self._$mainContainer);

            // Create modal
            self._$editRecordDialog = $('<div class="jtable-modal jtable-edit-modal"></div>')
                .appendTo(self._$editRecordOverlay);

            $('<h2 class="jtable-modal-header" id="editRecordDialogTitle"></h2>')
                .text(self.options.messages.editRecord)
                .appendTo(self._$editRecordDialog);

            const $cancelButton = $('<button type="button" class="jtable-dialog-button jtable-dialog-cancelbutton"></button>')
                .html('<span>' + self.options.messages.cancel + '</span>')
                .on('click', function () {
                    self._closeEditForm();
                });

            let $saveButton = $('<button type="button" class="jtable-dialog-button jtable-dialog-savebutton"></button>')
                .html('<span>' + self.options.messages.save + '</span>')
                .on('click', function () {
                    self._onSaveClickedOnEditForm();
                });

            $('<div class="jtable-modal-footer"></div>')
                .append($cancelButton, $saveButton)
                .appendTo(self._$editRecordDialog);

            // Close button
            $('<span class="jtable-modal-close">&times;</span>')
                .on('click', function() {
                    self._closeEditForm();
                })
                .appendTo(self._$editRecordDialog);

	    // initially closed
            self._closeEditForm();
        },

        /* Saves editing form to server.
         *************************************************************************/
        _onSaveClickedOnEditForm: function () {
            let self = this;

            // row maybe removed by another source, if so, do nothing
            if (self._$editingRow.hasClass('jtable-row-removed')) {
                self._closeEditForm();
                return;
            }

            let $editRecordForm = self._$editRecordDialog.find('form').first();
            // since the form is submitted via ajax, the validy of fields is not checked, we force it here
            if ($editRecordForm[0].checkValidity()) {
                let $saveButton = self._$editRecordDialog.find('#EditRecordDialogSaveButton');
                if (self._$mainContainer.trigger("formSubmitting", { form: $editRecordForm, formType: 'edit', row: self._$editingRow }) != false) {
                    self._setEnabledOfDialogButton($saveButton, false, self.options.messages.saving);
                    self._saveEditRecordForm($editRecordForm, $saveButton);
                }
                self._closeEditForm();
            } else {
                $editRecordForm[0].reportValidity();
            }
        },

        _closeEditForm: function () {
            this._$editRecordOverlay.hide();
            this._$mainContainer.trigger("formClosed", { form: this._$editRecordDialog.find('form').first(), formType: 'edit', row: this._$editingRow });
        },

        /************************************************************************
         * PUBLIC METHODS                                                        *
         *************************************************************************/
        editRecordByKey: function (recordKey) {
            const self = this;

            const tryOpen = function () {
                const $row = self.getRowByKey(recordKey);
                if ($row && $row.length) {
                    self._showEditRecordForm($row);
                } else {
                    self._showError("Could not find row for record key: " + recordKey);
                }
            };

            const rowsLoaded = self._$tableBody && self._$tableBody.find('tr.jtable-data-row').length > 0;

            if (!rowsLoaded) {
                self.load(null, tryOpen); // Only call once
            } else {
                tryOpen();
            }
        },

        editRecordViaAjax: function (recordKey, ajaxUrl) {
            let self = this;

            self._ajax({
                url: ajaxUrl,
                data: { [self._keyField]: recordKey },
                success: function (data) {
                    if (data.Result != 'OK') {
                        self._showError(data.Message);
                        return;
                    }
                    self._showEditRecordForm($('<tr></tr>').data('record', data.Record));
                },
                error: function () {
                    self._showError('Server error loading record');
                }
            });
        },

        /* Updates a record on the table (optionally on the server also)
         *************************************************************************/
        updateRecord: function (options) {
            let self = this;
            options = $.extend({
                clientOnly: false,
                animationsEnabled: self.options.animationsEnabled,
                success: function () { },
                error: function () { }
            }, options);

            if (!options.record) {
                self._logWarn('options parameter in updateRecord method must contain a record property.');
                return;
            }

            let key = self._getKeyValueOfRecord(options.record);
            if (key == undefined || key == null) {
                self._logWarn('options parameter in updateRecord method must contain a record that contains the key field property.');
                return;
            }

            let $updatingRow = self.getRowByKey(key);
            if ($updatingRow == null) {
                self._logWarn('Can not found any row by key "' + key + '" on the table. Updating row must be visible on the table.');
                return;
            }

            if (options.clientOnly) {
                $.extend($updatingRow.data('record'), options.record);
                self._updateRowTexts($updatingRow);
                self._onRecordUpdated($updatingRow, null);
                if (options.animationsEnabled) {
                    self._showUpdateAnimationForRow($updatingRow);
                }

                options.success();
                return;
            }

            let completeEdit = function (data) {
                if (data.Result != 'OK') {
                    self._showError(data.Message);
                    options.error(data);
                    return;
                }

                $.extend($updatingRow.data('record'), options.record);
                self._updateRecordValuesFromServerResponse($updatingRow.data('record'), data);

                self._updateRowTexts($updatingRow);
                self._onRecordUpdated($updatingRow, data);
                if (options.animationsEnabled) {
                    self._showUpdateAnimationForRow($updatingRow);
                }

                options.success(data);
            };

            // updateAction may be a function, check if it is
            if (!options.url && typeof self.options.actions.updateAction === "function") {

                // Execute the function
                let funcResult = self.options.actions.updateAction($.param(options.record));

                // Check if result is a jQuery Deferred object
                if (self._isDeferredObject(funcResult)) {
                    // Wait promise
                    funcResult.done(function (data) {
                        completeEdit(data);
                    }).fail(function () {
                        self._showError(self.options.messages.serverCommunicationError);
                        options.error();
                    });
                } else { // assume it returned the creation result
                    completeEdit(funcResult);
                }

            } else { // Assume it's a URL string

                // Make an Ajax call to create record
                self._submitFormUsingAjax(
                    options.url || self.options.actions.updateAction,
                    $.param(options.record),
                    function (data) {
                        completeEdit(data);
                    },
                    function () {
                        self._showError(self.options.messages.serverCommunicationError);
                        options.error();
                    });

            }
        },

        /************************************************************************
         * OVERRIDED METHODS                                                     *
         *************************************************************************/

        /* Overrides base method to add a 'editing column cell' to header row.
         *************************************************************************/
        _addColumnsToHeaderRow: function ($tr) {
            base._addColumnsToHeaderRow.apply(this, arguments);
            if (this.options.actions.updateAction != undefined) {
                $tr.append(this._createEmptyCommandHeader('jtable-column-header-edit'));
            }
        },

        /* Overrides base method to add a 'edit command cell' to a row.
         *************************************************************************/
        _addCellsToRowUsingRecord: function ($row) {
            let self = this;
            base._addCellsToRowUsingRecord.apply(this, arguments);

            if (self.options.actions.updateAction != undefined) {
                let $span = $('<span></span>').html(self.options.messages.editRecord);
                let $button = $('<button title="' + self.options.messages.editRecord + '"></button>')
                    .addClass('jtable-command-button jtable-edit-command-button')
                    .append($span)
                    .on("click", function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        self._showEditRecordForm($row);
                    });
                $('<td></td>')
                    .addClass('jtable-command-column')
                    .append($button)
                    .appendTo($row);
            }
        },

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* Shows edit form for a row.
         *************************************************************************/
        _showEditRecordForm: function ($tableRow) {
            let self = this;
            let record = $tableRow.data('record');

            // Create edit form
            let $editRecordForm = $('<form id="jtable-edit-form" class="jtable-dialog-form jtable-edit-form"></form>');

            // Create input fields
            for (let i = 0; i < self._fieldList.length; i++) {

                let fieldName = self._fieldList[i];
                let field = self.options.fields[fieldName];
                let fieldValue = record[fieldName];

                if (field.key == true) {
                    if (field.edit != true) {
                        // Create hidden field for key
                        $editRecordForm.append(self._createInputForHidden(fieldName, fieldValue));
                        continue;
                    } else {
                        // Create a special hidden field for key (since key is be editable)
                        $editRecordForm.append(self._createInputForHidden('jtRecordKey', fieldValue));
                    }
                }

                // Do not create element for non-editable fields
                if (field.edit == false) {
                    continue;
                }

                // Hidden field
                if (field.type == 'hidden') {
                    $editRecordForm.append(self._createInputForHidden(fieldName, fieldValue));
                    continue;
                }

                // Create a container div for this input field and add to form
                let $fieldContainer = $('<div />')
                    .addClass('jtable-input-field-container')
                    .attr('id', 'jtable-input-field-container-div-' + fieldName)
                    .appendTo($editRecordForm);

                // Create a label for input
                $fieldContainer.append(self._createInputLabelForRecordField(fieldName));

                // Create input element with it's current value
                let currentValue = self._getValueForRecordField(record, fieldName);
                $fieldContainer.append(
                    self._createInputForRecordField({
                        fieldName: fieldName,
                        value: currentValue,
                        record: record,
                        formType: 'edit',
                        form: $editRecordForm
                    }));
            }

            self._makeCascadeDropDowns($editRecordForm, record, 'edit');

            $editRecordForm.submit(function () {
                self._onSaveClickedOnEditForm();
                return false;
            });

            // Store the row being edited
            self._$editingRow = $tableRow;
            // Remove any existing form
            self._$editRecordDialog.find('form').first().remove();
 
            // Make sure people can click on the save button
            let $saveButton = self._$editRecordDialog.find('#EditRecordDialogSaveButton');
            self._setEnabledOfDialogButton($saveButton, true, self.options.messages.save);

            // Show the form
	    self._$editRecordDialog.find('#editRecordDialogTitle').first().after($editRecordForm);
            self._$editRecordOverlay.show();
            self._$mainContainer.trigger("formCreated", { form: $editRecordForm, formType: 'edit', record: record, row: $tableRow });
        },

        /* Saves editing form to the server and updates the record on the table.
         *************************************************************************/
        _saveEditRecordForm: function ($editRecordForm, $saveButton) {
            let self = this;

            let completeEdit = function (data) {
                if (data.Result != 'OK') {
                    self._showError(data.Message);
                    return;
                }

                let record = self._$editingRow.data('record');

                self._updateRecordValuesFromForm(record, $editRecordForm);
                self._updateRecordValuesFromServerResponse(record, data);
                self._updateRowTexts(self._$editingRow);

                self._$editingRow.attr('data-record-key', self._getKeyValueOfRecord(record));

                self._onRecordUpdated(self._$editingRow, data);

                if (self.options.animationsEnabled) {
                    self._showUpdateAnimationForRow(self._$editingRow);
                }

                self._closeEditForm();
            };


            // updateAction may be a function, check if it is
            if (typeof self.options.actions.updateAction === "function") {

                // Execute the function
                let funcResult = self.options.actions.updateAction($editRecordForm.serialize());

                // Check if result is a jQuery Deferred object
                if (self._isDeferredObject(funcResult)) {
                    // Wait promise
                    funcResult.done(function (data) {
                        completeEdit(data);
                    }).fail(function () {
                        self._showError(self.options.messages.serverCommunicationError);
                    });
                } else { // assume it returned the creation result
                    completeEdit(funcResult);
                }

            } else { // Assume it's a URL string
                // Make an Ajax call to update record
                self._submitFormUsingAjax(
                    self.options.actions.updateAction,
                    new FormData($editRecordForm[0]),
                    function(data) {
                        completeEdit(data);
                    },
                    function() {
                        self._showError(self.options.messages.serverCommunicationError);
                    });
            }

        },

        /* This method ensures updating of current record with server response,
         * if server sends a Record object as response to updateAction.
         *************************************************************************/
        _updateRecordValuesFromServerResponse: function (record, serverResponse) {
            if (!serverResponse || !serverResponse.Record) {
                return;
            }

            $.extend(true, record, serverResponse.Record);
        },

        /* Gets text for a field of a record according to it's type.
         *************************************************************************/
        _getValueForRecordField: function (record, fieldName) {
            let field = this.options.fields[fieldName];
            let fieldValue = record[fieldName];
            if (field.inputEscapeHTML) {
                return this._escapeHTML(fieldValue);
            } else {
                return fieldValue;
            }
        },

        /* Updates cells of a table row's text values from row's record values.
         *************************************************************************/
        _updateRowTexts: function ($tableRow) {
            let record = $tableRow.data('record');
            let $columns = $tableRow.find('td');
            for (let i = 0; i < this._columnList.length; i++) {
                let displayItem = this._getDisplayTextForRecordField(record, this._columnList[i]);
                if ((displayItem === 0)) displayItem = "0";
                $columns.eq(this._firstDataColumnOffset + i).html(displayItem || '');
            }

            this._onRowUpdated($tableRow);
        },

        /* Shows 'updated' animation for a table row.
         *************************************************************************/
        _showUpdateAnimationForRow: function ($tableRow) {
            let className = 'jtable-row-updated';
            if (this.options.jqueryuiTheme) {
                className = className + ' ui-state-highlight';
            }

            $tableRow.stop(true, true).addClass(className);
            setTimeout(function () {
                $tableRow.removeClass(className);
            }, 5000);
        },

        /************************************************************************
         * EVENT RAISING METHODS                                                 *
         *************************************************************************/

        _onRowUpdated: function ($row) {
            this._$mainContainer.trigger("rowUpdated", { row: $row, record: $row.data('record') });
        },

        _onRecordUpdated: function ($row, data) {
            if (data.Message) {
                this._showInfo(data.Message);
            }
            this._$mainContainer.trigger("recordUpdated", { record: $row.data('record'), row: $row, serverResponse: data });
        }

    });

})(jQuery);


/************************************************************************
 * CLONE RECORD extension for jTable                                    *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        _initializeSettings: jTable.prototype._initializeSettings,
        _create: jTable.prototype._create,
        _addColumnsToHeaderRow: jTable.prototype._addColumnsToHeaderRow,
        _addCellsToRowUsingRecord: jTable.prototype._addCellsToRowUsingRecord
    };

    $.extend(true, jTable.prototype, {

        options: {
            // Localization
            messages: {
                cloneRecord: 'Clone Record'
            }
        },

        _initializeSettings: function () {
            base._initializeSettings.apply(this, arguments);
            this._$cloneRecordDialog = null; // Reference to the cloning dialog div (jQuery object)
            this._$cloningRow = null; // Reference to currently cloning row (jQuery object)
        },

        _create: function () {
            base._create.apply(this, arguments);

            // Only add clone if cloneAction is available
            if (!this.options.actions.cloneAction) {
                return;
            }
            this._createCloneRecordDialog();
        },

        _createCloneRecordDialog: function () {
            let self = this;

            // Create overlay
            self._$cloneRecordOverlay = $('<div class="jtable-modal-overlay"></div>')
                .prependTo(self._$mainContainer);

            // Create modal
            self._$cloneRecordDialog = $('<div class="jtable-modal jtable-clone-modal"></div>')
                .appendTo(self._$cloneRecordOverlay);

            $('<h2 class="jtable-modal-header" id="cloneRecordDialogTitle"></h2>')
                .text(self.options.messages.cloneRecord)
                .appendTo(self._$cloneRecordDialog);

            const $cancelButton = $('<button type="button" class="jtable-dialog-button jtable-dialog-cancelbutton"></button>')
                .html('<span>' + self.options.messages.cancel + '</span>')
                .on('click', function () {
                    self._closeCloneForm();
                });

            let $saveButton = $('<button type="button" class="jtable-dialog-button jtable-dialog-savebutton"></button>')
                .html('<span>' + self.options.messages.save + '</span>')
                .on('click', function () {
                    self._onSaveClickedOnCloneForm();
                });

            $('<div class="jtable-modal-footer"></div>')
                .append($cancelButton, $saveButton)
                .appendTo(self._$cloneRecordDialog);

            // Close button
            $('<span class="jtable-modal-close">&times;</span>')
                .on('click', function() {
                    self._closeCloneForm();
                })
                .appendTo(self._$cloneRecordDialog);

	    // initially closed
            self._closeCloneForm();
        },

        // Add "Clone" button to the header and rows, after Edit
        _addColumnsToHeaderRow: function ($tr) {
            base._addColumnsToHeaderRow.apply(this, arguments);
            if (this.options.actions.cloneAction != undefined) {
                $tr.append(this._createEmptyCommandHeader('jtable-column-header-clone'));
            }
        },

        _addCellsToRowUsingRecord: function ($row) {
            base._addCellsToRowUsingRecord.apply(this, arguments);
            let self = this;
            if (self.options.actions.cloneAction != undefined) {
                let $span = $('<span></span>').html(self.options.messages.cloneRecord);
                let $button = $('<button title="' + self.options.messages.cloneRecord + '"></button>')
                    .addClass('jtable-command-button jtable-clone-command-button')
                    .append($span)
                    .on("click", function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        self._showCloneRecordForm($row);
                    });
                $('<td></td>')
                    .addClass('jtable-command-column')
                    .append($button)
                    .appendTo($row);
            }
        },

        _showCloneRecordForm: function ($tableRow) {
            let self = this;
            let record = $.extend(true, {}, $tableRow.data('record')); // deep copy

            // Clear key fields to avoid conflict
            for (let i = 0; i < self._fieldList.length; i++) {
                let fieldName = self._fieldList[i];
                if (self.options.fields[fieldName].key) {
                    record[fieldName] = undefined; // or ''
                }
            }

            // Clone form
            let $cloneRecordForm = $('<form id="jtable-clone-form" class="jtable-dialog-form jtable-clone-form"></form>');

            for (let i = 0; i < self._fieldList.length; i++) {
                let fieldName = self._fieldList[i];
                let field = self.options.fields[fieldName];

                // Do not allow editing key fields unless create == true
                if (field.key == true && field.create != true) {
                    continue;
                }
                if (field.create == false) {
                    continue;
                }
                if (field.type == 'hidden') {
                    $cloneRecordForm.append(self._createInputForHidden(fieldName, record[fieldName]));
                    continue;
                }

                let $fieldContainer = $('<div />')
                    .addClass('jtable-input-field-container')
                    .attr('id', 'jtable-input-field-container-div-' + fieldName)
                    .appendTo($cloneRecordForm);

                $fieldContainer.append(self._createInputLabelForRecordField(fieldName));
                $fieldContainer.append(
                    self._createInputForRecordField({
                        fieldName: fieldName,
                        value: record[fieldName],
                        record: record,
                        formType: 'clone',
                        form: $cloneRecordForm
                    })
                );
            }

            self._makeCascadeDropDowns($cloneRecordForm, record, 'clone');

            $cloneRecordForm.submit(function () {
                self._onSaveClickedOnCloneForm();
                return false;
            });

            self._$cloningRow = $tableRow;
            self._$cloneRecordDialog.find('form').first().remove();

            let $saveButton = self._$cloneRecordDialog.find('#CloneRecordDialogSaveButton');
            self._setEnabledOfDialogButton($saveButton, true, self.options.messages.save);

            // Show the form
            self._$cloneRecordDialog.find('#cloneRecordDialogTitle').first().after($cloneRecordForm);
            self._$cloneRecordOverlay.show();
            self._$mainContainer.trigger("formCreated", { form: $cloneRecordForm, formType: 'clone', record: record, row: $tableRow });
        },

        _onSaveClickedOnCloneForm: function () {
            let self = this;
            let $cloneRecordForm = self._$cloneRecordDialog.find('form').first();
            // since the form is submitted via ajax, the validy of fields is not checked, we force it here
            if ($cloneRecordForm[0].checkValidity()) {
                let $saveButton = self._$cloneRecordDialog.find('#CloneRecordDialogSaveButton');
                if (self._$mainContainer.trigger("formSubmitting", { form: $cloneRecordForm, formType: 'clone', row: self._$cloningRow }) != false) {
                    self._setEnabledOfDialogButton($saveButton, false, self.options.messages.saving);
                    self._saveCloneRecordForm($cloneRecordForm, $saveButton);
                }
            } else {
                $cloneRecordForm[0].reportValidity();
            }
        },

        _closeCloneForm: function () {
            this._$cloneRecordOverlay.hide();
            this._$mainContainer.trigger("formClosed", { form: this._$cloneRecordDialog.find('form').first(), formType: 'clone', row: this._$cloningRow });
        },

        _saveCloneRecordForm: function ($cloneRecordForm, $saveButton) {
            let self = this;

            let completeCloneRecord = function (data) {
                if (data.Result != 'OK') {
                    self._showError(data.Message);
                    return;
                }
                if (!data.Record) {
                    self._logError('Server must return the created Record object.');
                    return;
                }

                self._onRecordAdded(data);
                self._addRowToTable(
                    self._createRowFromRecord(data.Record), {
                        isNewRow: true
                    });
                self._closeCloneForm();
            };

            // cloneAction may be a function, check if it is
            if (typeof self.options.actions.cloneAction === "function") {
                let funcResult = self.options.actions.cloneAction($cloneRecordForm.serialize());
                if (self._isDeferredObject(funcResult)) {
                    funcResult.done(function (data) {
                        completeCloneRecord(data);
                    }).fail(function () {
                        self._showError(self.options.messages.serverCommunicationError);
                    });
                } else {
                    completeCloneRecord(funcResult);
                }
            } else { // Assume it's a URL string
                self._submitFormUsingAjax(
                    self.options.actions.cloneAction,
                    new FormData($cloneRecordForm[0]),
                    function (data) {
                        completeCloneRecord(data);
                    },
                    function () {
                        self._showError(self.options.messages.serverCommunicationError);
                    }
                );
            }
        }
    });

})(jQuery);


/************************************************************************
 * DELETION extension for jTable                                         *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        _initializeSettings: jTable.prototype._initializeSettings,
        _create: jTable.prototype._create,
        _loadExtraSettings: jTable.prototype._loadExtraSettings,
        _addColumnsToHeaderRow: jTable.prototype._addColumnsToHeaderRow,
        _addCellsToRowUsingRecord: jTable.prototype._addCellsToRowUsingRecord
    };

    // extension members
    $.extend(true, jTable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {

            // Options
            deleteConfirmation: true,

            // Functions for events
            recordDeleted: function (event, data) { },

            // Localization
            messages: {
                deleteConfirmation: 'This record will be deleted. Are you sure?',
                deleteText: 'Delete',
                deleting: 'Deleting',
                canNotDeletedRecords: 'Can not delete {0} of {1} records!',
                deleteProggress: 'Deleting {0} of {1} records, processing...'
            }
        },

        /************************************************************************
         * CONSTRUCTOR AND INITIALIZING METHODS                                  *
         *************************************************************************/

        /* Overrides _initializeSettings method
         *************************************************************************/
        _initializeSettings: function () {
            base._initializeSettings.apply(this, arguments);
            this._$deleteDialog = null; // Reference to the delete record dialog div (jQuery object)
            this._$deletingRow = null; // Reference to currently deleting row (jQuery object)
        },

        /* Overrides base method to do deletion-specific constructions.
         *************************************************************************/
        _create: function () {
            base._create.apply(this, arguments);

            this._createDeleteDialog();
        },

        /* Overrides _loadExtraSettings method
         *************************************************************************/
        _loadExtraSettings: function () {
            base._loadExtraSettings.apply(this, arguments);

            if (!this._keyField && this.options.actions.deleteAction != undefined) {
                this.options.actions.deleteAction = undefined;
                this._logWarn('No key field defined, setting deleteAction to undefined.');
            }
        },

        /* Creates and prepares delete record confirmation dialog div.
         *************************************************************************/
        _createDeleteDialog: function () {
            let self = this;

            // Create overlay
            self._$deleteOverlay = $('<div class="jtable-modal-overlay"></div>')
                .prependTo(self._$mainContainer);

            // Create modal
            self._$deleteDialog = $('<div class="jtable-modal jtable-delete-modal"></div>')
                .appendTo(self._$deleteOverlay);

            $('<h2 class="jtable-modal-header"></h2>')
                .text(self.options.messages.areYouSure)
                .appendTo(self._$deleteDialog);

            $('<div class="jtable-modal-body"><p><span class="alert-icon"></span><span class="jtable-delete-confirm-message"></span></p></div>')
                .appendTo(self._$deleteDialog);

            const $cancelButton = $('<button type="button" class="jtable-dialog-button jtable-dialog-cancelbutton"></button>')
                .html('<span>' + self.options.messages.cancel + '</span>')
                .on('click', function () {
                    self._closeDeleteDialog();
                });

            let $deleteButton = $('<button type="button" class="jtable-dialog-button jtable-dialog-deletebutton"></button>')
                .html('<span>' + self.options.messages.deleteText + '</span>')
                .on('click', function () {
                    if (self._$deletingRow.hasClass('jtable-row-removed')) {
                        self._closeDeleteDialog();
                        return;
                    }
                    self._setEnabledOfDialogButton($deleteButton, false, self.options.messages.deleting);
                    self._deleteRecordFromServer(
                        self._$deletingRow,
                        function (data) {
                            self._removeRowsFromTableWithAnimation(self._$deletingRow);
                            self._closeDeleteDialog();
                            if (data.Message) {
                                self._showInfo(data.Message);
                            }
                        },
                        function (message) {
                            self._showError(message);
                        }
                    );
                });

            $('<div class="jtable-modal-footer"></div>')
                .append($cancelButton, $deleteButton)
                .appendTo(self._$deleteDialog);

            // Close button
            $('<span class="jtable-modal-close">&times;</span>')
                .on('click', function() {
                    self._closeDeleteDialog();
                })
                .appendTo(self._$deleteDialog);

	    // initially closed
            self._closeDeleteDialog();
        },

        _closeDeleteDialog: function () {
            this._$deleteOverlay.hide();
        },

        /************************************************************************
         * PUBLIC METHODS                                                        *
         *************************************************************************/

        /* This method is used to delete one or more rows from server and the table.
         *************************************************************************/
        deleteRows: function ($rows) {
            let self = this;

            if ($rows.length <= 0) {
                self._logWarn('No rows specified to jTable deleteRows method.');
                return;
            }

            if (self._isBusy()) {
                self._logWarn('Can not delete rows since jTable is busy!');
                return;
            }

            // Deleting just one row
            if ($rows.length == 1) {
                self._deleteRecordFromServer(
                    $rows,
                    function () { // success
                        self._removeRowsFromTableWithAnimation($rows);
                    },
                    function (message) { // error
                        self._showError(message);
                    }
                );

                return;
            }

            // Deleting multiple rows
            self._showBusy(self._formatString(self.options.messages.deleteProggress, 0, $rows.length));

            // This method checks if deleting of all records is completed
            let completedCount = 0;
            let isCompleted = function () {
                return (completedCount >= $rows.length);
            };

            // This method is called when deleting of all records completed
            let completed = function () {
                let $deletedRows = $rows.filter('.jtable-row-ready-to-remove');
                if ($deletedRows.length < $rows.length) {
                    self._showError(self._formatString(self.options.messages.canNotDeletedRecords, $rows.length - $deletedRows.length, $rows.length));
                }

                if ($deletedRows.length > 0) {
                    self._removeRowsFromTableWithAnimation($deletedRows);
                }

                self._hideBusy();
            };

            // Delete all selected rows
            let deletedCount = 0;
            $rows.each(function () {
                let $row = $(this);
                self._deleteRecordFromServer(
                    $row,
                    function () { // success
                        ++deletedCount; ++completedCount;
                        $row.addClass('jtable-row-ready-to-remove');
                        self._showBusy(self._formatString(self.options.messages.deleteProggress, deletedCount, $rows.length));
                        if (isCompleted()) {
                            completed();
                        }
                    },
                    function () { // error
                        ++completedCount;
                        if (isCompleted()) {
                            completed();
                        }
                    }
                );
            });
        },

        /* Deletes a record from the table (optionally from the server also).
         *************************************************************************/
        deleteRecord: function (options) {
            let self = this;
            options = $.extend({
                clientOnly: false,
                animationsEnabled: self.options.animationsEnabled,
                url: self.options.actions.deleteAction,
                success: function () { },
                error: function () { }
            }, options);

            if (options.key == undefined) {
                self._logWarn('options parameter in deleteRecord method must contain a key property.');
                return;
            }

            let $deletingRow = self.getRowByKey(options.key);
            if ($deletingRow == null) {
                self._logWarn('Can not found any row by key: ' + options.key);
                return;
            }

            if (options.clientOnly) {
                self._removeRowsFromTableWithAnimation($deletingRow, options.animationsEnabled);
                options.success();
                return;
            }

            self._deleteRecordFromServer(
                $deletingRow,
                function (data) { // success
                    self._removeRowsFromTableWithAnimation($deletingRow, options.animationsEnabled);
                    options.success(data);
                },
                function (message) { // error
                    self._showError(message);
                    options.error(message);
                },
                options.url
            );
        },

        /************************************************************************
         * OVERRIDED METHODS                                                     *
         *************************************************************************/

        /* Overrides base method to add a 'deletion column cell' to header row.
         *************************************************************************/
        _addColumnsToHeaderRow: function ($tr) {
            base._addColumnsToHeaderRow.apply(this, arguments);
            if (this.options.actions.deleteAction != undefined) {
                $tr.append(this._createEmptyCommandHeader('jtable-column-header-delete'));
            }
        },

        /* Overrides base method to add a 'delete command cell' to a row.
         *************************************************************************/
        _addCellsToRowUsingRecord: function ($row) {
            base._addCellsToRowUsingRecord.apply(this, arguments);

            let self = this;
            if (self.options.actions.deleteAction != undefined) {
                let $span = $('<span></span>').html(self.options.messages.deleteText);
                let $button = $('<button title="' + self.options.messages.deleteText + '"></button>')
                    .addClass('jtable-command-button jtable-delete-command-button')
                    .append($span)
                    .on("click", function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        self._deleteButtonClickedForRow($row);
                    });
                $('<td></td>')
                    .addClass('jtable-command-column')
                    .append($button)
                    .appendTo($row);
            }
        },

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* This method is called when a user clicks the delete button on a row.
         *************************************************************************/
        _deleteButtonClickedForRow: function ($row) {
            let self = this;

            let deleteConfirm;
            let deleteConfirmMessage = self.options.messages.deleteConfirmation;

            // If options.deleteConfirmation is function then call it
            if (typeof self.options.deleteConfirmation === "function") {
                let data = { row: $row, record: $row.data('record'), deleteConfirm: true, deleteConfirmMessage: deleteConfirmMessage, cancel: false, cancelMessage: null };
                self.options.deleteConfirmation(data);

                // If delete progress is cancelled
                if (data.cancel) {

                    // If a cancel reason is specified
                    if (data.cancelMessage) {
                        self._showError(data.cancelMessage); // TODO: show warning/stop message instead of error (also show warning/error ui icon)!
                    }

                    return;
                }

                deleteConfirmMessage = data.deleteConfirmMessage;
                deleteConfirm = data.deleteConfirm;
            } else {
                deleteConfirm = self.options.deleteConfirmation;
            }

            if (deleteConfirm != false) {
                // Confirmation
                self._showDeleteDialog($row, deleteConfirmMessage);
            } else {
                // No confirmation
                self._deleteRecordFromServer(
                    $row,
                    function (data) { // success
                        self._removeRowsFromTableWithAnimation($row);
                        if (data.Message) {
                            self._showInfo(data.Message);
                        }
                    },
                    function (message) { // error
                        self._showError(message);
                    }
                );
            }
        },

        /* Shows delete comfirmation dialog.
         *************************************************************************/
        _showDeleteDialog: function ($row, deleteConfirmMessage) {
            this._$deletingRow = $row;
            this._$deleteDialog.find('.jtable-delete-confirm-message').html(deleteConfirmMessage);
            let $deleteButton = this._$deleteDialog.find('.jtable-dialog-deletebutton');
            this._setEnabledOfDialogButton($deleteButton, true, this.options.messages.deleteText);
            this._$deleteOverlay.show();
        },

        /* Performs an ajax call to server to delete record
         *  and removes row of the record from table if ajax call success.
         *************************************************************************/
        _deleteRecordFromServer: function ($row, success, error, url) {
            let self = this;

            let completeDelete = function(data) {
                if (data.Result != 'OK') {
                    $row.data('deleting', false);
                    if (error) {
                        error(data.Message);
                    }

                    return;
                }

                self._$mainContainer.trigger("recordDeleted", { record: $row.data('record'), row: $row, serverResponse: data });

                if (success) {
                    success(data);
                }
            };

            // Check if it is already being deleted right now
            if ($row.data('deleting') == true) {
                return;
            }

            $row.data('deleting', true);

            let postData = {};
            postData[self._keyField] = self._getKeyValueOfRecord($row.data('record'));

            // deleteAction may be a function, check if it is
            if (!url && typeof self.options.actions.deleteAction === "function") {

                // Execute the function
                let funcResult = self.options.actions.deleteAction(postData);

                // Check if result is a jQuery Deferred object
                if (self._isDeferredObject(funcResult)) {
                    // Wait promise
                    funcResult.done(function (data) {
                        completeDelete(data);
                    }).fail(function () {
                        $row.data('deleting', false);
                        if (error) {
                            error(self.options.messages.serverCommunicationError);
                        }
                    });
                } else { // assume it returned the deletion result
                    completeDelete(funcResult);
                }

            } else { // Assume it's a URL string
                // Make ajax call to delete the record from server
                this._ajax({
                    url: (url || self.options.actions.deleteAction),
                    data: postData,
                    success: function (data) {
                        completeDelete(data);
                    },
                    error: function () {
                        $row.data('deleting', false);
                        if (error) {
                            error(self.options.messages.serverCommunicationError);
                        }
                    }
                });

            }
        },

        /* Removes a row from table after a 'deleting' animation.
         *************************************************************************/
        _removeRowsFromTableWithAnimation: function ($rows, animationsEnabled) {
            let self = this;

            if (animationsEnabled == undefined) {
                animationsEnabled = self.options.animationsEnabled;
            }

            if (animationsEnabled) {
                let className = 'jtable-row-deleting';
                if (this.options.jqueryuiTheme) {
                    className = className + ' ui-state-disabled';
                }

                // Stop current animation (if does exists) and begin 'deleting' animation.
                $rows.stop(true, true).addClass(className);
                setTimeout(function () {
                    self._removeRowsFromTable($rows, 'deleted');
                }, 600); // "slow" = ~600ms
            } else {
                self._removeRowsFromTable($rows, 'deleted');
            }
        }

    });

})(jQuery);


/************************************************************************
 * SELECTING extension for jTable                                        *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        _initializeSettings: jTable.prototype._initializeSettings,
        _create: jTable.prototype._create,
        _loadExtraSettings: jTable.prototype._loadExtraSettings,
        _addColumnsToHeaderRow: jTable.prototype._addColumnsToHeaderRow,
        _addCellsToRowUsingRecord: jTable.prototype._addCellsToRowUsingRecord,
        _onLoadingRecords: jTable.prototype._onLoadingRecords,
        _onRecordsLoaded: jTable.prototype._onRecordsLoaded,
        _onRowsRemoved: jTable.prototype._onRowsRemoved
    };

    // extension members
    $.extend(true, jTable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {

            // Options
            selecting: false,
            multiselect: false,
            selectingCheckboxes: false,
            selectOnRowClick: true,

            // Functions for events
            selectionChanged: function (event, data) { }
        },

        /************************************************************************
         * CONSTRUCTOR AND INITIALIZING METHODS                                  *
         *************************************************************************/

        /* Overrides _initializeSettings method
         *************************************************************************/
        _initializeSettings: function () {
            base._initializeSettings.apply(this, arguments);
            this._selectedRecordIdsBeforeLoad = null; // This array is used to store selected row Id's to restore them after a page refresh (string array).
            this._$selectAllCheckbox = null; // Reference to the 'select/deselect all' checkbox (jQuery object)
            this._shiftKeyDown = false; // True, if shift key is currently down.
            if (this.options.selecting && this.options.selectingCheckboxes) {
                ++this._firstDataColumnOffset;
            }
        },

        /* Overrides base method to do selecting-specific constructions.
         *************************************************************************/
        _create: function () {
            if (this.options.selecting && this.options.selectingCheckboxes) {
                this._bindKeyboardEvents();
            }

            // Call base method
            base._create.apply(this, arguments);
        },

        /* Overrides _loadExtraSettings method
         *************************************************************************/
        _loadExtraSettings: function () {
            base._loadExtraSettings.apply(this, arguments);

            if (this.options.selecting && !this._keyField) {
                this.options.selecting = false;
                this._logWarn('No key field defined, selecting is not possible.');
            }
        },


        /* Registers to keyboard events those are needed for selection
         *************************************************************************/
        _bindKeyboardEvents: function () {
            let self = this;
            // Register to events to set _shiftKeyDown value
            $(document)
                .on("keydown", function (event) {
                    switch (event.which) {
                        case 16:
                            self._shiftKeyDown = true;
                            break;
                    }
                })
                .on("keyup", function (event) {
                    switch (event.which) {
                        case 16:
                            self._shiftKeyDown = false;
                            break;
                    }
                });
        },

        /************************************************************************
         * PUBLIC METHODS                                                        *
         *************************************************************************/

        /* Gets jQuery selection for currently selected rows.
         *************************************************************************/
        selectedRows: function () {
            return this._getSelectedRows();
        },

        /* Makes row/rows 'selected'.
         *************************************************************************/
        selectRows: function ($rows) {
            this._selectRows($rows);
            this._onSelectionChanged();
        },

        /* Makes row/rows 'deselected'.
         *************************************************************************/
        deselectRows: function ($rows) {
            this._deselectRows($rows);
            this._onSelectionChanged();
        },

        /* Inverts selection state of a single row.
         *************************************************************************/
        invertRowSelection: function ($row) {
            this._invertRowSelection($row);
            this._onSelectionChanged();
        },

        /************************************************************************
         * OVERRIDED METHODS                                                     *
         *************************************************************************/

        /* Overrides base method to add a 'select column' to header row.
         *************************************************************************/
        _addColumnsToHeaderRow: function ($tr) {
            if (this.options.selecting && this.options.selectingCheckboxes) {
                if (this.options.multiselect) {
                    $tr.append(this._createSelectAllHeader());
                } else {
                    $tr.append(this._createEmptyCommandHeader());
                }
            }

            base._addColumnsToHeaderRow.apply(this, arguments);
        },

        /* Overrides base method to add a 'delete command cell' to a row.
         *************************************************************************/
        _addCellsToRowUsingRecord: function ($row) {
            if (this.options.selecting) {
                this._makeRowSelectable($row);
            }

            base._addCellsToRowUsingRecord.apply(this, arguments);
        },

        /* Overrides base event to store selection list
         *************************************************************************/
        _onLoadingRecords: function () {
            if (this.options.selecting) {
                this._storeSelectionList();
            }

            base._onLoadingRecords.apply(this, arguments);
        },

        /* Overrides base event to restore selection list
         *************************************************************************/
        _onRecordsLoaded: function () {
            if (this.options.selecting) {
                this._restoreSelectionList();
            }

            base._onRecordsLoaded.apply(this, arguments);
        },

        /* Overrides base event to check is any selected row is being removed.
         *************************************************************************/
        _onRowsRemoved: function ($rows, reason) {
            if (this.options.selecting && (reason != 'reloading') && ($rows.filter('.jtable-row-selected').length > 0)) {
                this._onSelectionChanged();
            }

            base._onRowsRemoved.apply(this, arguments);
        },

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* Creates a header column to select/deselect all rows.
         *************************************************************************/
        _createSelectAllHeader: function () {
            let self = this;

            let $columnHeader = $('<th class=""></th>')
                .addClass('jtable-command-column jtable-command-column-header jtable-column-header-select');
            this._jqueryuiThemeAddClass($columnHeader, 'ui-state-default');

            let $headerContainer = $('<div />')
                .addClass('jtable-column-header-container')
                .appendTo($columnHeader);

            self._$selectAllCheckbox = $('<input class="jtable-column-header-checkbox" type="checkbox" />')
                .appendTo($headerContainer)
                .on("click", function () {
                    if (self._$tableRows.length <= 0) {
                        self._$selectAllCheckbox.prop('checked', false);
                        return;
                    }

                    let allRows = self._$tableBody.find('>tr.jtable-data-row');
                    if (self._$selectAllCheckbox.prop('checked')) {
                        self._selectRows(allRows);
                    } else {
                        self._deselectRows(allRows);
                    }

                    self._onSelectionChanged();
                });

            return $columnHeader;
        },

        /* Stores Id's of currently selected records to _selectedRecordIdsBeforeLoad.
         *************************************************************************/
        _storeSelectionList: function () {
            let self = this;

            if (!self.options.selecting) {
                return;
            }

            self._selectedRecordIdsBeforeLoad = [];
            self._getSelectedRows().each(function () {
                self._selectedRecordIdsBeforeLoad.push(self._getKeyValueOfRecord($(this).data('record')));
            });
        },

        /* Selects rows whose Id is in _selectedRecordIdsBeforeLoad;
         *************************************************************************/
        _restoreSelectionList: function () {
            let self = this;

            if (!self.options.selecting) {
                return;
            }

            let selectedRowCount = 0;
            for (let i = 0; i < self._$tableRows.length; ++i) {
                let recordId = self._getKeyValueOfRecord(self._$tableRows[i].data('record'));
                if ($.inArray(recordId, self._selectedRecordIdsBeforeLoad) > -1) {
                    self._selectRows(self._$tableRows[i]);
                    ++selectedRowCount;
                }
            }

            if (self._selectedRecordIdsBeforeLoad.length > 0 && self._selectedRecordIdsBeforeLoad.length != selectedRowCount) {
                self._onSelectionChanged();
            }

            self._selectedRecordIdsBeforeLoad = [];
            self._refreshSelectAllCheckboxState();
        },

        /* Gets all selected rows.
         *************************************************************************/
        _getSelectedRows: function () {
            return this._$tableBody
                .find('>tr.jtable-row-selected');
        },

        /* Adds selectable feature to a row.
         *************************************************************************/
        _makeRowSelectable: function ($row) {
            let self = this;

            // Select/deselect on row click
            if (self.options.selectOnRowClick) {
                $row.on("click", function (e) {
                    if (!$(e.target).hasClass('norowselectonclick')) {
                        self._invertRowSelection($row);
                    }
                });
            }

            // 'select/deselect' checkbox column
            if (self.options.selectingCheckboxes) {
                let $cell = $('<td></td>').addClass('jtable-command-column jtable-selecting-column');
                let $selectCheckbox = $('<input type="checkbox" />').appendTo($cell);
                if (!self.options.selectOnRowClick) {
                    $selectCheckbox.on("click", function () {
                        self._invertRowSelection($row);
                    });
                }

                $row.append($cell);
            }
        },

        /* Inverts selection state of a single row.
         *************************************************************************/
        _invertRowSelection: function ($row) {
            if ($row.hasClass('jtable-row-selected')) {
                this._deselectRows($row);
            } else {
                // Shift key?
                if (this._shiftKeyDown) {
                    let rowIndex = this._findRowIndex($row);
                    // try to select row and above rows until first selected row
                    let beforeIndex = this._findFirstSelectedRowIndexBeforeIndex(rowIndex) + 1;
                    if (beforeIndex > 0 && beforeIndex < rowIndex) {
                        this._selectRows(this._$tableBody.find('tr').slice(beforeIndex, rowIndex + 1));
                    } else {
                        // try to select row and below rows until first selected row
                        let afterIndex = this._findFirstSelectedRowIndexAfterIndex(rowIndex) - 1;
                        if (afterIndex > rowIndex) {
                            this._selectRows(this._$tableBody.find('tr').slice(rowIndex, afterIndex + 1));
                        } else {
                            // just select this row
                            this._selectRows($row);
                        }
                    }
                } else {
                    this._selectRows($row);
                }
            }

            this._onSelectionChanged();
        },

        /* Search for a selected row (that is before given row index) to up and returns it's index 
         *************************************************************************/
        _findFirstSelectedRowIndexBeforeIndex: function (rowIndex) {
            for (let i = rowIndex - 1; i >= 0; --i) {
                if (this._$tableRows[i].hasClass('jtable-row-selected')) {
                    return i;
                }
            }

            return -1;
        },

        /* Search for a selected row (that is after given row index) to down and returns it's index 
         *************************************************************************/
        _findFirstSelectedRowIndexAfterIndex: function (rowIndex) {
            for (let i = rowIndex + 1; i < this._$tableRows.length; ++i) {
                if (this._$tableRows[i].hasClass('jtable-row-selected')) {
                    return i;
                }
            }

            return -1;
        },

        /* Makes row/rows 'selected'.
         *************************************************************************/
        _selectRows: function ($rows) {
            if (!this.options.multiselect) {
                this._deselectRows(this._getSelectedRows());
            }

            $rows.addClass('jtable-row-selected');
            this._jqueryuiThemeAddClass($rows, 'ui-state-highlight');

            if (this.options.selectingCheckboxes) {
                $rows.find('>td.jtable-selecting-column >input').prop('checked', true);
            }

            this._refreshSelectAllCheckboxState();
        },

        /* Makes row/rows 'non selected'.
         *************************************************************************/
        _deselectRows: function ($rows) {
            $rows.removeClass('jtable-row-selected ui-state-highlight');
            if (this.options.selectingCheckboxes) {
                $rows.find('>td.jtable-selecting-column >input').prop('checked', false);
            }

            this._refreshSelectAllCheckboxState();
        },

        /* Updates state of the 'select/deselect' all checkbox according to count of selected rows.
         *************************************************************************/
        _refreshSelectAllCheckboxState: function () {
            if (!this.options.selectingCheckboxes || !this.options.multiselect) {
                return;
            }

            let totalRowCount = this._$tableRows.length;
            let selectedRowCount = this._getSelectedRows().length;

            if (selectedRowCount == 0) {
                this._$selectAllCheckbox.prop('indeterminate', false);
                this._$selectAllCheckbox.prop('checked', false);
            } else if (selectedRowCount == totalRowCount) {
                this._$selectAllCheckbox.prop('indeterminate', false);
                this._$selectAllCheckbox.prop('checked', true);
            } else {
                this._$selectAllCheckbox.prop('checked', false);
                this._$selectAllCheckbox.prop('indeterminate', true);
            }
        },

        /************************************************************************
         * EVENT RAISING METHODS                                                 *
         *************************************************************************/

        _onSelectionChanged: function () {
            this._$mainContainer.trigger("selectionChanged", {});
        }

    });

})(jQuery);


/************************************************************************
 * PAGING extension for jTable                                           *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        load: jTable.prototype.load,
        resetTable: jTable.prototype.resetTable,
        _normalizeFieldOptions: jTable.prototype._normalizeFieldOptions,
        _initializeSettings: jTable.prototype._initializeSettings,
        _create: jTable.prototype._create,
        _setOption: jTable.prototype._setOption,
        // _createRecordLoadUrl: jTable.prototype._createRecordLoadUrl,
        _createJtParamsForLoading: jTable.prototype._createJtParamsForLoading,
        _addRowToTable: jTable.prototype._addRowToTable,
        _removeRowsFromTable: jTable.prototype._removeRowsFromTable,
        _onRecordsLoaded: jTable.prototype._onRecordsLoaded
    };

    // extension members
    $.extend(true, jTable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {
            paging: false,
            pageList: 'normal', // possible values: 'minimal', 'normal'
            pageSize: 10,
            pageSizes: [10, 25, 50, 100, 250, 500],
            pageSizeChangeArea: true,
            gotoPageArea: 'combobox', // possible values: 'textbox', 'combobox', 'none'

            messages: {
                pagingInfo: 'Showing {0}-{1} of {2}',
                pageSizeChangeLabel: 'Row count',
                gotoPageLabel: 'Go to page'
            }
        },

        /************************************************************************
         * CONSTRUCTOR AND INITIALIZING METHODS                                  *
         *************************************************************************/

        /* Overrides _initializeSettings method
         *************************************************************************/
        _initializeSettings: function () {
            base._initializeSettings.apply(this, arguments);
            this._$bottomPanel = null; // Reference to the panel at the bottom of the table (jQuery object)
            this._$pagingListArea = null; // Reference to the page list area in to bottom panel (jQuery object)
            this._$pageSizeChangeArea = null; // Reference to the page size change area in to bottom panel (jQuery object)
            this._$pageInfoSpan = null; // Reference to the paging info area in to bottom panel (jQuery object)
            this._$gotoPageArea = null; // Reference to 'Go to page' input area in to bottom panel (jQuery object)
            this._$gotoPageInput = null; // Reference to 'Go to page' input in to bottom panel (jQuery object)
            this._totalRecordCount = 0; // Total count of records on all pages
            this._currentPageNo = 1; // Current page number
            this._originalPageSize = 0;
        },

        _normalizeFieldOptions: function (fieldName, props) {
            base._normalizeFieldOptions.apply(this, arguments);
            if (!this._originalPageSize) {
                this._originalPageSize = this.options.pageSize;
            }
        },

        /* Overrides base method to do paging-specific constructions.
         *************************************************************************/
        _create: function() {
            base._create.apply(this, arguments);
            if (this.options.paging) {
                this._loadPagingSettings();
                this._createBottomPanel();
                this._createPageListArea();
                this._createGotoPageInput();
                this._createPageSizeSelection();
            }
        },

        /* Loads user preferences for paging.
         *************************************************************************/
        _loadPagingSettings: function() {
            if (!this.options.saveUserPreferences) {
                return;
            }

            let pageSize = this._getUserPref('page-size');
            if (pageSize == null) {
                return;
            }
            if (!pageSize) { // empty cookie? Remove it
                self._removeUserPref('page-size');
                return;
            }
            if (pageSize) {
                this.options.pageSize = this._normalizeNumber(pageSize, 1, 1000000, this.options.pageSize);
            }
        },

        /* Creates bottom panel and adds to the page.
         *************************************************************************/
        _createBottomPanel: function() {
            this._$bottomPanel = $('<div />')
                .addClass('jtable-bottom-panel')
                .insertAfter(this._$tableDiv);

            this._jqueryuiThemeAddClass(this._$bottomPanel, 'ui-state-default');

            $('<div />').addClass('jtable-left-area').appendTo(this._$bottomPanel);
            $('<div />').addClass('jtable-right-area').appendTo(this._$bottomPanel);
        },

        /* Creates page list area.
         *************************************************************************/
        _createPageListArea: function() {
            this._$pagingListArea = $('<span></span>')
                .addClass('jtable-page-list')
                .appendTo(this._$bottomPanel.find('.jtable-left-area'));

            this._$pageInfoSpan = $('<span></span>')
                .addClass('jtable-page-info')
                .appendTo(this._$bottomPanel.find('.jtable-right-area'));
        },

        /* Creates page list change area.
         *************************************************************************/
        _createPageSizeSelection: function() {
            let self = this;

            if (!self.options.pageSizeChangeArea) {
                return;
            }

            // Add current page size to page sizes list if not contains it
            if (self._findIndexInArray(self.options.pageSize, self.options.pageSizes) < 0) {
                self.options.pageSizes.push(parseInt(self.options.pageSize));
                self.options.pageSizes.sort(function(a, b) { return a - b; });
            }

            // Add a span to contain page size change items
            self._$pageSizeChangeArea = $('<span></span>')
                .addClass('jtable-page-size-change')
                .appendTo(self._$bottomPanel.find('.jtable-left-area'));

            // Page size label
            self._$pageSizeChangeArea.append('<span>' + self.options.messages.pageSizeChangeLabel + ': </span>');

            // Page size change combobox
            let $pageSizeChangeCombobox = $('<select class="jtable-page-size-select"></select>').appendTo(self._$pageSizeChangeArea);

            // Add page sizes to the combobox
            for (let i = 0; i < self.options.pageSizes.length; i++) {
                $pageSizeChangeCombobox.append('<option value="' + self.options.pageSizes[i] + '">' + self.options.pageSizes[i] + '</option>');
            }

            // Select current page size
            $pageSizeChangeCombobox.val(self.options.pageSize);

            // Change page size on combobox change
            $pageSizeChangeCombobox.change(function() {
                self._changePageSize(parseInt($(this).val()));
            });
        },

        /* Creates go to page area.
         *************************************************************************/
        _createGotoPageInput: function() {
            let self = this;

            if (!self.options.gotoPageArea || self.options.gotoPageArea == 'none') {
                return;
            }

            // Add a span to contain goto page items
            this._$gotoPageArea = $('<span></span>')
                .addClass('jtable-goto-page')
                .appendTo(self._$bottomPanel.find('.jtable-left-area'));

            // Goto page label
            this._$gotoPageArea.append('<span>' + self.options.messages.gotoPageLabel + ': </span>');

            // Goto page input
            if (self.options.gotoPageArea == 'combobox') {

                self._$gotoPageInput = $('<select class="jtable-page-goto-select"></select>')
                    .appendTo(this._$gotoPageArea)
                    .data('pageCount', 1)
                    .change(function() {
                        self._changePage(parseInt($(this).val()));
                    });
                self._$gotoPageInput.append('<option value="1">1</option>');

            } else { // textbox

                self._$gotoPageInput = $('<input type="text" maxlength="10" value="' + self._currentPageNo + '" />')
                    .appendTo(this._$gotoPageArea)
                    .keypress(function(event) {
                        if (event.which == 13) { // enter
                            event.preventDefault();
                            self._changePage(parseInt(self._$gotoPageInput.val()));
                        } else if (event.which == 43) { // +
                            event.preventDefault();
                            self._changePage(parseInt(self._$gotoPageInput.val()) + 1);
                        } else if (event.which == 45) { // -
                            event.preventDefault();
                            self._changePage(parseInt(self._$gotoPageInput.val()) - 1);
                        } else {
                            // Allow only digits
                            let isValid = (
                                (47 < event.keyCode && event.keyCode < 58 && event.shiftKey == false && event.altKey == false)
                                || (event.keyCode == 8)
                                || (event.keyCode == 9)
                            );

                            if (!isValid) {
                                event.preventDefault();
                            }
                        }
                    });

            }
        },

        /* Refreshes the 'go to page' input.
         *************************************************************************/
        _refreshGotoPageInput: function() {
            if (!this.options.gotoPageArea || this.options.gotoPageArea == 'none') {
                return;
            }

            if (this._totalRecordCount <= 0) {
                this._$gotoPageArea.hide();
            } else {
                this._$gotoPageArea.show();
            }

            if (this.options.gotoPageArea == 'combobox') {
                let oldPageCount = this._$gotoPageInput.data('pageCount');
                let currentPageCount = this._calculatePageCount();
                if (oldPageCount != currentPageCount) {
                    this._$gotoPageInput.empty();

                    // Skip some pages is there are too many pages
                    let pageStep = 1;
                    if (currentPageCount > 10000) {
                        pageStep = 100;
                    } else if (currentPageCount > 5000) {
                        pageStep = 10;
                    } else if (currentPageCount > 2000) {
                        pageStep = 5;
                    } else if (currentPageCount > 1000) {
                        pageStep = 2;
                    }

                    for (let i = pageStep; i <= currentPageCount; i += pageStep) {
                        this._$gotoPageInput.append('<option value="' + i + '">' + i + '</option>');
                    }

                    this._$gotoPageInput.data('pageCount', currentPageCount);
                }
            }

            // same for 'textbox' and 'combobox'
            this._$gotoPageInput.val(this._currentPageNo);
        },

        /************************************************************************
         * OVERRIDED METHODS                                                     *
         *************************************************************************/

        /* Overrides load method to set current page to 1.
         *************************************************************************/
        load: function() {
            this._currentPageNo = 1;
            base.load.apply(this, arguments);
        },

        /* reset te pagesize when resetting the table
         *************************************************************************/
        resetTable: function() {
            if (this.options.saveUserPreferences) {
                this._removeUserPref('page-size');
            }
            this.options.pageSize = this._originalPageSize;
            base.resetTable.apply(this, arguments);
        },

        /* Used to change options dynamically after initialization.
         *************************************************************************/
        _setOption: function(key, value) {
            base._setOption.apply(this, arguments);

            if (key == 'pageSize') {
                this._changePageSize(parseInt(value));
            }
        },

        /* Changes current page size with given value.
         *************************************************************************/
        _changePageSize: function(pageSize) {
            if (pageSize == this.options.pageSize) {
                return;
            }

            this.options.pageSize = pageSize;

            // Normalize current page
            let pageCount = this._calculatePageCount();
            if (this._currentPageNo > pageCount) {
                this._currentPageNo = pageCount;
            }
            if (this._currentPageNo <= 0) {
                this._currentPageNo = 1;
            }

            // if user sets one of the options on the combobox, then select it.
            let $pageSizeChangeCombobox = this._$bottomPanel.find('.jtable-page-size-change select');
            if ($pageSizeChangeCombobox.length > 0) {
                if (parseInt($pageSizeChangeCombobox.val()) != pageSize) {
                    let selectedOption = $pageSizeChangeCombobox.find('option[value=' + pageSize + ']');
                    if (selectedOption.length > 0) {
                        $pageSizeChangeCombobox.val(pageSize);
                    }
                }
            }

            this._savePagingSettings();
            this._reloadTable();
        },

        /* Saves user preferences for paging
         *************************************************************************/
        _savePagingSettings: function() {
            if (!this.options.saveUserPreferences) {
                return;
            }

            this._setUserPref('page-size', this.options.pageSize);
        },

        /* Overrides _createRecordLoadUrl method to add paging info to URL.
         *************************************************************************/
        /*
        _createRecordLoadUrl: function() {
            let loadUrl = base._createRecordLoadUrl.apply(this, arguments);
            loadUrl = this._addPagingInfoToUrl(loadUrl, this._currentPageNo);
            return loadUrl;
        },
        */

        /* Overrides _createJtParamsForLoading method to add paging parameters to jtParams object.
         *************************************************************************/
        _createJtParamsForLoading: function () {
            let jtParams = base._createJtParamsForLoading.apply(this, arguments);

            if (this.options.paging) {
                jtParams.jtStartIndex = (this._currentPageNo - 1) * this.options.pageSize;
                jtParams.jtPageSize = this.options.pageSize;
            }

            return jtParams;
        },

        /* Overrides _addRowToTable method to re-load table when a new row is created.
         *************************************************************************/
        _addRowToTable: function ($row, options) {
            if (options && options.isNewRow && this.options.paging) {
                this._reloadTable();
                return;
            }

            base._addRowToTable.apply(this, arguments);
        },

        /* Overrides _removeRowsFromTable method to re-load table when a row is removed from table.
         *************************************************************************/
        _removeRowsFromTable: function ($rows, reason) {
            base._removeRowsFromTable.apply(this, arguments);

            if (this.options.paging) {
                if (this._$tableRows.length <= 0 && this._currentPageNo > 1) {
                    --this._currentPageNo;
                }

                this._reloadTable();
            }
        },

        /* Overrides _onRecordsLoaded method to to do paging specific tasks.
         *************************************************************************/
        _onRecordsLoaded: function (data) {
            if (this.options.paging) {
                this._totalRecordCount = data.TotalRecordCount;
                this._createPagingList();
                this._createPagingInfo();
                this._refreshGotoPageInput();

                // if all rows from the current page were deleted serverwise (not via the delete method), go one page back
                if (this._$tableRows.length <= 0 && this._currentPageNo > 1) {
                    --this._currentPageNo;
                    this._reloadTable();
                }
            }

            base._onRecordsLoaded.apply(this, arguments);
        },

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* Adds jtStartIndex and jtPageSize parameters to a URL as query string.
         *************************************************************************/
        _addPagingInfoToUrl: function (url, pageNumber) {
            if (!this.options.paging) {
                return url;
            }

            let jtStartIndex = (pageNumber - 1) * this.options.pageSize;
            let jtPageSize = this.options.pageSize;

            return (url + (url.includes('?') ? '?' : '&') + 'jtStartIndex=' + jtStartIndex + '&jtPageSize=' + jtPageSize);
        },

        /* Creates and shows the page list.
         *************************************************************************/
        _createPagingList: function () {
            if (this.options.pageSize <= 0) {
                return;
            }

            this._$pagingListArea.empty();
            if (this._totalRecordCount <= 0) {
                return;
            }

            let pageCount = this._calculatePageCount();

            this._createFirstAndPreviousPageButtons();
            if (this.options.pageList == 'normal') {
                this._createPageNumberButtons(this._calculatePageNumbers(pageCount));
            }
            this._createLastAndNextPageButtons(pageCount);
            this._bindClickEventsToPageNumberButtons();
        },

        /* Creates and shows previous and first page links.
         *************************************************************************/
        _createFirstAndPreviousPageButtons: function () {
            let $first = $('<span></span>')
                .addClass('jtable-page-number-first')
                .html('&lt&lt')
                .data('pageNumber', 1)
                .appendTo(this._$pagingListArea);

            let $previous = $('<span></span>')
                .addClass('jtable-page-number-previous')
                .html('&lt')
                .data('pageNumber', this._currentPageNo - 1)
                .appendTo(this._$pagingListArea);

            this._jqueryuiThemeAddClass($first, 'ui-button ui-state-default', 'ui-state-hover');
            this._jqueryuiThemeAddClass($previous, 'ui-button ui-state-default', 'ui-state-hover');

            if (this._currentPageNo <= 1) {
                $first.addClass('jtable-page-number-disabled');
                $previous.addClass('jtable-page-number-disabled');
                this._jqueryuiThemeAddClass($first, 'ui-state-disabled');
                this._jqueryuiThemeAddClass($previous, 'ui-state-disabled');
            }
        },

        /* Creates and shows next and last page links.
         *************************************************************************/
        _createLastAndNextPageButtons: function (pageCount) {
            let $next = $('<span></span>')
                .addClass('jtable-page-number-next')
                .html('&gt')
                .data('pageNumber', this._currentPageNo + 1)
                .appendTo(this._$pagingListArea);
            let $last = $('<span></span>')
                .addClass('jtable-page-number-last')
                .html('&gt&gt')
                .data('pageNumber', pageCount)
                .appendTo(this._$pagingListArea);

            this._jqueryuiThemeAddClass($next, 'ui-button ui-state-default', 'ui-state-hover');
            this._jqueryuiThemeAddClass($last, 'ui-button ui-state-default', 'ui-state-hover');

            if (this._currentPageNo >= pageCount) {
                $next.addClass('jtable-page-number-disabled');
                $last.addClass('jtable-page-number-disabled');
                this._jqueryuiThemeAddClass($next, 'ui-state-disabled');
                this._jqueryuiThemeAddClass($last, 'ui-state-disabled');
            }
        },

        /* Creates and shows page number links for given number array.
         *************************************************************************/
        _createPageNumberButtons: function (pageNumbers) {
            let previousNumber = 0;
            for (let i = 0; i < pageNumbers.length; i++) {
                // Create "..." between page numbers if needed
                if ((pageNumbers[i] - previousNumber) > 1) {
                    $('<span></span>')
                        .addClass('jtable-page-number-space')
                        .html('...')
                        .appendTo(this._$pagingListArea);
                }

                this._createPageNumberButton(pageNumbers[i]);
                previousNumber = pageNumbers[i];
            }
        },

        /* Creates a page number link and adds to paging area.
         *************************************************************************/
        _createPageNumberButton: function (pageNumber) {
            let $pageNumber = $('<span></span>')
                .addClass('jtable-page-number')
                .html(pageNumber)
                .data('pageNumber', pageNumber)
                .appendTo(this._$pagingListArea);

            this._jqueryuiThemeAddClass($pageNumber, 'ui-button ui-state-default', 'ui-state-hover');

            if (this._currentPageNo == pageNumber) {
                $pageNumber.addClass('jtable-page-number-active jtable-page-number-disabled');
                this._jqueryuiThemeAddClass($pageNumber, 'ui-state-active');
            }
        },

        /* Calculates total page count according to page size and total record count.
         *************************************************************************/
        _calculatePageCount: function () {
            let pageCount = Math.floor(this._totalRecordCount / this.options.pageSize);
            if (this._totalRecordCount % this.options.pageSize != 0) {
                ++pageCount;
            }

            return pageCount;
        },

        /* Calculates page numbers and returns an array of these numbers.
         *************************************************************************/
        _calculatePageNumbers: function (pageCount) {
            if (pageCount <= 4) {
                // Show all pages
                let pageNumbers = [];
                for (let i = 1; i <= pageCount; ++i) {
                    pageNumbers.push(i);
                }

                return pageNumbers;
            } else {
                // show first three, last three, current, previous and next page numbers
                let shownPageNumbers = [1, 2, pageCount - 1, pageCount];
                let previousPageNo = this._normalizeNumber(this._currentPageNo - 1, 1, pageCount, 1);
                let nextPageNo = this._normalizeNumber(this._currentPageNo + 1, 1, pageCount, 1);

                this._insertToArrayIfDoesNotExists(shownPageNumbers, previousPageNo);
                this._insertToArrayIfDoesNotExists(shownPageNumbers, this._currentPageNo);
                this._insertToArrayIfDoesNotExists(shownPageNumbers, nextPageNo);

                shownPageNumbers.sort(function (a, b) { return a - b; });
                return shownPageNumbers;
            }
        },

        /* Creates and shows paging informations.
         *************************************************************************/
        _createPagingInfo: function () {
            if (this._totalRecordCount <= 0) {
                this._$pageInfoSpan.empty();
                return;
            }

            let startNo = (this._currentPageNo - 1) * this.options.pageSize + 1;
            let endNo = this._currentPageNo * this.options.pageSize;
            endNo = this._normalizeNumber(endNo, startNo, this._totalRecordCount, 0);

            if (endNo >= startNo) {
                let pagingInfoMessage = this._formatString(this.options.messages.pagingInfo, startNo, endNo, this._totalRecordCount);
                this._$pageInfoSpan.html(pagingInfoMessage);
            }
        },

        /* Binds click events of all page links to change the page.
         *************************************************************************/
        _bindClickEventsToPageNumberButtons: function () {
            let self = this;
            self._$pagingListArea
                .find('.jtable-page-number,.jtable-page-number-previous,.jtable-page-number-next,.jtable-page-number-first,.jtable-page-number-last')
                .not('.jtable-page-number-disabled')
                .on("click", function (e) {
                    e.preventDefault();
                    self._changePage($(this).data('pageNumber'));
                });
        },

        /* Changes current page to given value.
         *************************************************************************/
        _changePage: function (pageNo) {
            pageNo = this._normalizeNumber(pageNo, 1, this._calculatePageCount(), 1);
            if (pageNo == this._currentPageNo) {
                this._refreshGotoPageInput();
                return;
            }

            this._currentPageNo = pageNo;
            this._reloadTable();
        }

    });

})(jQuery);


/************************************************************************
 * SORTING extension for jTable                                          *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        resetTable: jTable.prototype.resetTable,
        _initializeSettings: jTable.prototype._initializeSettings,
        _normalizeFieldOptions: jTable.prototype._normalizeFieldOptions,
        _doExtraActions: jTable.prototype._doExtraActions,
        _onRecordsLoaded: jTable.prototype._onRecordsLoaded,
        _createHeaderCellForField: jTable.prototype._createHeaderCellForField,
        // _createRecordLoadUrl: jTable.prototype._createRecordLoadUrl,
        _createJtParamsForLoading: jTable.prototype._createJtParamsForLoading
    };

    // extension members
    $.extend(true, jTable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {
            sorting: false,
            multiSorting: false,
            multiSortingCtrlKey: true,
            roomForSortableIcon: true,
            defaultSorting: '',
            sortingInfoSelector: '',
            sortingInfoReset: true,
            tableReset: false,
            // Localization
            messages: {
                sortingInfoPrefix: 'Sorting applied: ',
                sortingInfoSuffix: '',
                ascending: 'Ascending',
                descending: 'Descending',
                sortingInfoNone: 'No sorting applied',
                resetSorting: 'Reset sorting',
                resetTable: 'Reset table'
            }

        },

        /************************************************************************
         * CONSTRUCTOR AND INITIALIZING METHODS                                  *
         *************************************************************************/

        /* reset te pagesize when resetting the table
         *************************************************************************/
        resetTable: function() {
            if (this.options.saveUserPreferences) {
                this._removeUserPref('column-sortsettings');
            }
            base.resetTable.apply(this, arguments);
        },

        /* Overrides _initializeSettings method
         *************************************************************************/
        _initializeSettings: function () {
            base._initializeSettings.apply(this, arguments);
            this._lastSorting = [];
        },

        /* Overrides _normalizeFieldOptions method to normalize sorting option for fields.
         *************************************************************************/
        _normalizeFieldOptions: function (fieldName, props) {
            base._normalizeFieldOptions.apply(this, arguments);
            props.sorting = (props.sorting != false);
        },

        /* Overrides _doExtraActions method for sorting
         *************************************************************************/
        _doExtraActions: function () {
            base._doExtraActions.apply(this, arguments);
            if (!this.options.sorting) {
                return;
            }
            if (this.options.saveUserPreferences) {
                this._loadColumnSortSettings();
            }
            if (this._lastSorting.length == 0) {
                this._buildDefaultSortingArray();
            }
        },

        /* Overrides _onRecordsLoaded method to to do sorting specific tasks.
         *************************************************************************/
        _onRecordsLoaded: function (data) {
            let self = this;
            if (self.options.sortingInfoSelector) {
                let sortingInfo = self.getSortingInfo();
                let sortingInfoString = '';
                if (sortingInfo && sortingInfo.length > 0) {
                    sortingInfoString = self.options.messages.sortingInfoPrefix;
                    $.each(sortingInfo, function (idx, sortingVal) {
                        if (idx > 0) sortingInfoString += ', ';
                        sortingInfoString += sortingVal.fieldTitle + ' (' + (sortingVal.sortOrder === 'ASC' ? self.options.messages.ascending : self.options.messages.descending) + ')';
                    });
                } else {
                    sortingInfoString = self.options.messages.sortingInfoNone;
                }
                $(self.options.sortingInfoSelector).text(sortingInfoString);
                if (self.options.sortingInfoReset) {
                    $('<button type="button" class="jtable-dialog-button jtable-resetsorting-button"></button>')
                        .html('<span>' + self.options.messages.resetSorting + '</span>')
                        .on('click', function () {
                            self.resetSorting();
                        })
                        .appendTo(self.options.sortingInfoSelector);
                }
                if (self.options.tableReset) {
                    $('<button type="button" class="jtable-dialog-button jtable-resettable-button"></button>')
                        .html('<span>' + self.options.messages.resetTable + '</span>')
                        .on('click', function () {
                            self.resetTable();
                        })
                        .appendTo(self.options.sortingInfoSelector);
                }
                if (self.options.messages.sortingInfoSuffix.length > 0) {
                    $('<span"></span>')
                        .html(self.options.messages.sortingInfoSuffix)
                        .appendTo(self.options.sortingInfoSelector);
                }
            }
            base._onRecordsLoaded.apply(self, arguments);
        },

        /* Overrides _createHeaderCellForField to make columns sortable.
         *************************************************************************/
        _createHeaderCellForField: function (fieldName, field) {
            let $headerCell = base._createHeaderCellForField.apply(this, arguments);
            if (this.options.sorting && field.sorting) {
                this._makeColumnSortable($headerCell, fieldName, field.initialSortingDirection);
            }

            return $headerCell;
        },

        /* Overrides _createRecordLoadUrl to add sorting specific info to URL.
         *************************************************************************/
        /*
        _createRecordLoadUrl: function () {
            let loadUrl = base._createRecordLoadUrl.apply(this, arguments);
            loadUrl = this._addSortingInfoToUrl(loadUrl);
            return loadUrl;
        },*/

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* Builds the sorting array according to defaultSorting string
         *************************************************************************/
        _buildDefaultSortingArray: function () {
            let self = this;

            $.each(self.options.defaultSorting.split(","), function (orderIndex, orderValue) {
                $.each(self.options.fields, function (fieldName, fieldProps) {
                    if (fieldProps.sorting) {
                        let colOffset = orderValue.indexOf(fieldName);
                        if (colOffset > -1) {
                            if (orderValue.toUpperCase().includes(' DESC', colOffset)) {
                                self._lastSorting.push({
                                    fieldName: fieldName,
                                    sortOrder: 'DESC'
                                });
                            } else {
                                self._lastSorting.push({
                                    fieldName: fieldName,
                                    sortOrder: 'ASC'
                                });
                            }
                        }
                    }
                });
            });
        },

        /* Makes a column sortable.
         *************************************************************************/
        _makeColumnSortable: function ($columnHeader, fieldName, initialSortingDirection) {
            let self = this;

            // Add some empty spaces after the text so the background icon has room next to it
            // one could play with css and ::after, but then the width calculation of columns borks
            // TODO: this should be configurable in number
            if (self.options.roomForSortableIcon) {
                $columnHeader.find('.jtable-column-header-text').append('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
            }

            $columnHeader
                .addClass('jtable-column-header-sortable')
                .on("click", function (e) {
                    e.preventDefault();
                    let multiSortingCtrlKey = self.options.multiSortingCtrlKey;
                    // mobile: no ctrl-key present ...
                    if (/Mobi|Android/i.test(navigator.userAgent)) {
                        multiSortingCtrlKey=false;
                    }
                    //if (!self.options.multiSorting || !e.ctrlKey) {
                    if (!self.options.multiSorting || 
                        (multiSortingCtrlKey && !e.ctrlKey)) {
                        self._lastSorting = []; // clear previous sorting
                        // also remove column styling from other columns
                        $columnHeader.siblings().removeClass('jtable-column-header-sorted-asc jtable-column-header-sorted-desc');
                    }
                    self._sortTableByColumn($columnHeader);
                });

            if (initialSortingDirection) {
                $columnHeader.addClass('jtable-column-header-sorted-' + initialSortingDirection.toLowerCase());
            }        

            // Set default sorting
            $.each(this._lastSorting, function (sortIndex, sortField) {
                if (sortField.fieldName == fieldName) {
                    if (sortField.sortOrder == 'DESC') {
                        $columnHeader.addClass('jtable-column-header-sorted-desc');
                    } else {
                        $columnHeader.addClass('jtable-column-header-sorted-asc');
                    }
                }
            });
        },

        /* Sorts table according to a column header.
         *************************************************************************/
        _sortTableByColumn: function ($columnHeader) {
            let self = this;

            // If current sorting list includes this column, remove it from the list
            // We'll then re-add it with the correct class
            for (let i = 0; i < self._lastSorting.length; i++) {
                if (self._lastSorting[i].fieldName == $columnHeader.data('fieldName')) {
                    self._lastSorting.splice(i--, 1);
                }
            }

            // Sort ASC or DESC according to current sorting state
            // From ASC => DESC, from DESC => nothing, from nothing => ASC
            if ($columnHeader.hasClass('jtable-column-header-sorted-asc')) {
                $columnHeader.removeClass('jtable-column-header-sorted-asc').addClass('jtable-column-header-sorted-desc');
                self._lastSorting.push({
                    'fieldName': $columnHeader.data('fieldName'),
                    sortOrder: 'DESC'
                });
            } else if ($columnHeader.hasClass('jtable-column-header-sorted-desc')) {
                $columnHeader.removeClass('jtable-column-header-sorted-desc');
            } else {
                $columnHeader.addClass('jtable-column-header-sorted-asc');
                self._lastSorting.push({
                    'fieldName': $columnHeader.data('fieldName'),
                    sortOrder: 'ASC'
                });
            }

            if (self.options.saveUserPreferences) {
                self._saveColumnSortSettings();
            }
            self._reloadTable();
        },

        /* Adds jtSorting parameter to a URL as query string.
         *************************************************************************/
        /*
        _addSortingInfoToUrl: function (url) {
            if (!this.options.sorting || this._lastSorting.length == 0) {
                return url;
            }

            let sorting = [];
            $.each(this._lastSorting, function (idx, value) {
                sorting.push(value.fieldName + ' ' + value.sortOrder);
            });

            return (url + (url.includes('?') ? '?' : '&') + 'jtSorting=' + sorting.join(","));
        },
        */

        /* Overrides _createJtParamsForLoading method to add sorting parameters to jtParams object.
         *************************************************************************/
        _createJtParamsForLoading: function () {
            let self = this;
            let jtParams = base._createJtParamsForLoading.apply(this, arguments);

            if (self.options.sorting && (self._lastSorting.length || self.options.defaultSorting.length)) {
                let sorting = [];
                $.each(self._lastSorting, function (idx, value) {
                    sorting.push(value.fieldName + ' ' + value.sortOrder);
                });
                // If no sorted columns but default sort is configured, then we use that as a base
                // see also _buildDefaultSortingArray
                if (sorting.length==0 && self.options.defaultSorting.length) {
                    $.each(self.options.defaultSorting.split(","), function (orderIndex, orderValue) {
                        $.each(self.options.fields, function (fieldName, fieldProps) {
                            if (fieldProps.sorting) {
                                let colOffset = orderValue.indexOf(fieldName);
                                if (colOffset > -1) {
                                    if (orderValue.toUpperCase().includes(' DESC', colOffset)) {
                                        sorting.push(fieldName + ' DESC' );
                                    } else {
                                        sorting.push(fieldName + ' ASC' );
                                    }
                                }
                            }
                        });
                    });
                }
                jtParams.jtSorting = sorting.join(", ");
            }

            return jtParams;
        },

        /* Saves field setting to cookie.
         *  Saved setting will be a string like that:
         * fieldName1=ASC|fieldName2=DESC|...
         *************************************************************************/
        _saveColumnSortSettings: function () {
            let fieldSettings = '';
            $.each(this._lastSorting, function (idx, value) {
                let fieldSetting = value.fieldName + "=" + value.sortOrder;
                fieldSettings = fieldSettings + fieldSetting + '|';
            });
            this._setUserPref('column-sortsettings', fieldSettings.substr(0, fieldSettings.length - 1));
        },

        /* Loads field settings from cookie that is saved by _saveColumnSortSettings method.
         *************************************************************************/
        _loadColumnSortSettings: function () {
            let self = this;

            let columnSortSettingsUserPref = self._getUserPref('column-sortsettings');
            if (columnSortSettingsUserPref == null) {
                return;
            }
            if (!columnSortSettingsUserPref) { // empty cookie? Remove it
                self._removeUserPref('column-sortsettings');
                return;
            }
            self._lastSorting = [];
            $.each(columnSortSettingsUserPref.split('|'), function (inx, fieldSetting) {
                let splitted = fieldSetting.split('=');
                let fieldName = splitted[0];
                let sortOrder = splitted[1];
                // make sure the cookie contains expected valid values
                if (sortOrder == "ASC" || sortOrder == "DESC") {
                    if ($.inArray(fieldName,self._fieldList) > -1) {
                        self._lastSorting.push({
                            'fieldName': fieldName,
                            'sortOrder': sortOrder
                        });
                    }
                }
            });
        },

        /* return an arry with column title (if any, or fieldname otherwise) and sortorder
         *********************************************************************************/
        getSortingInfo: function() {
            let self = this;

            let SortingInfo = [];
            $.each(self._lastSorting, function (sortIndex, sortField) {
                let field = self.options.fields[sortField.fieldName];
                SortingInfo.push({
                    'fieldTitle': field.title || sortField.fieldName,
                    'sortOrder': sortField.sortOrder
                });
            });
            return SortingInfo;
        },

        /* reset sorting order to default
         *********************************************************************************/
        resetSorting: function() {
            let self = this;

            if (self.options.saveUserPreferences) {
                self._removeUserPref('column-sortsettings');
            }
            self.destroy();
            self._create();
            self.load();
            //$container.jtable('_create');
            //$container.jtable(options);
        },

    });

})(jQuery);

/************************************************************************
 * DYNAMIC COLUMNS extension for jTable                                  *
 * (Show/hide/resize columns)                                            *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        resetTable: jTable.prototype.resetTable,
        _initializeSettings: jTable.prototype._initializeSettings,
        _create: jTable.prototype._create,
        _loadExtraSettings: jTable.prototype._loadExtraSettings,
        _normalizeFieldOptions: jTable.prototype._normalizeFieldOptions,
        _createHeaderCellForField: jTable.prototype._createHeaderCellForField,
        _createCellForRecordField: jTable.prototype._createCellForRecordField
    };

    // extension members
    $.extend(true, jTable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/

        options: {
            columnResizable: true,
            columnSelectable: true,
            columnSelectableResizeMain: true,
        },

        /************************************************************************
         * CONSTRUCTOR AND INITIALIZING METHODS                                  *
         *************************************************************************/

        /* reset te pagesize when resetting the table
         *************************************************************************/
        resetTable: function() {
            const self = this;

            if (self.options.saveUserPreferences) {
                self._removeUserPref('column-settings');
            }
            for (let i = 0; i < self._columnList.length; i++) {
                let columnName = self._columnList[i];
                const originalVisibility = self._originalColumnVisibility[columnName];
                self._changeColumnVisibilityInternal(columnName, originalVisibility);
            }

            base.resetTable.apply(self, arguments);
        },

        /* Overrides _initializeSettings method
         *************************************************************************/
        _initializeSettings: function () {
            base._initializeSettings.apply(this, arguments);
            this._$columnSelectionDiv = null;
            this._$columnResizeBar = null;
            this._$_currentResizeArgs = null;
            this._originalColumnVisibility = {};
        },

        /* Overrides _create method.
         *************************************************************************/

        _create: function () {
            base._create.apply(this, arguments);

            this._createColumnResizeBar();
            this._createColumnSelection();

            this._normalizeColumnWidths();
        },

        /* Overrides _loadExtraSettings method for width and visibility
         *************************************************************************/
        _loadExtraSettings: function () {
            base._loadExtraSettings.apply(this, arguments);

            if (this.options.saveUserPreferences) {
                this._loadColumnSettings();
            }
        },

        /* Normalizes some options for a field (sets default values).
         *************************************************************************/
        _normalizeFieldOptions: function (fieldName, props) {
            base._normalizeFieldOptions.apply(this, arguments);

            // columnResizable
            if (this.options.columnResizable) {
                props.columnResizable = (props.columnResizable != false);
            } else {
                props.columnResizable = false;
            }

            // visibility
            if (!props.visibility) {
                props.visibility = 'visible';
            }
            // store the original visibility, so we can restore too
            if (!this._originalColumnVisibility[fieldName]) {
                this._originalColumnVisibility[fieldName] = props.visibility;
            }
        },

        /* Overrides _createHeaderCellForField to make columns dynamic.
         *************************************************************************/
        _createHeaderCellForField: function (fieldName, field) {
            let $headerCell = base._createHeaderCellForField.apply(this, arguments);

            // Make data columns resizable except the last one
            if (field.columnResizable) {
                this._makeColumnResizable($headerCell);
            }

            // Hide column if needed
            if (field.visibility == 'hidden' || field.visibility == 'separator') {
                $headerCell.hide();
            }

            return $headerCell;
        },

        /* Overrides _createCellForRecordField to decide show or hide a column.
         *************************************************************************/
        _createCellForRecordField: function (record, fieldName) {
            let $column = base._createCellForRecordField.apply(this, arguments);

            let field = this.options.fields[fieldName];
            if (field.visibility == 'hidden' || field.visibility == 'separator') {
                $column.hide();
            }

            return $column;
        },

        /************************************************************************
         * PUBLIC METHODS                                                        *
         *************************************************************************/

        /* Changes visibility of a column.
         *************************************************************************/
        changeColumnVisibility: function (columnName, visibility) {
            this._changeColumnVisibilityInternal(columnName, visibility);
            this._normalizeColumnWidths();
            if (this.options.saveUserPreferences) {
                this._saveColumnSettings();
            }
        },

        /* recalc width of columns.
         * usefull when a table becomes visible
         *************************************************************************/
        recalcColumnWidths: function () {
            const self = this;

            // Get regular columns
            const headerCells = self._$table.find('>thead th:not(.jtable-command-column-header)');
            if (!headerCells.length) return;

            // Calculate widths only for visible content
            const visibleRegularColumns = headerCells.filter(':visible');

            // We just set the width to the known width again (from the options, either configured or loaded from user pref)
            this._loadColumnSettings();
            visibleRegularColumns.each(function(index) {
                const $cell = $(this);
                const fieldName = $cell.data('fieldName');
                if (self.options.fields[fieldName].width) {
                    $cell.css('width', self.options.fields[fieldName].width);
                }
            });
            self._normalizeColumnWidths();
        },
        recalcColumnWidthsOnce: function() {
            // Check if we've already recalculated (using a data attribute)
            if (!this._$mainContainer.data('recalculated-once')) {
                this.recalcColumnWidths(); // Call the original method
                this._$mainContainer.data('recalculated-once', true); // Mark as done
            }
        },

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* Changes visibility of a column.
         * This function is only called to change visibility to 'visible' or 'hidden'
         * so other values are ignored
         *************************************************************************/
        _changeColumnVisibilityInternal: function (columnName, visibility) {
            // Check if there is a column with given name
            let columnIndex = this._columnList.indexOf(columnName);
            if (columnIndex < 0) {
                this._logWarn('Column "' + columnName + '" does not exist in fields!');
                return;
            }

            // Check if visibility value is valid
            if ($.inArray(visibility,['visible', 'hidden']) < 0) {
                this._logWarn('Visibility value is not valid: "' + visibility + '"! Setting to visible.');
                visibility = 'visible';
            }

            // Get the field
            let field = this.options.fields[columnName];
            if (field.visibility == visibility) {
                return; // No action if new value is same as old one.
            }

            // Hide or show the column if needed
            let columnIndexInTable = this._firstDataColumnOffset + columnIndex + 1;
            if (field.visibility != 'hidden' && visibility == 'hidden') {
                this._$table
                    .find('>thead >tr >th:nth-child(' + columnIndexInTable + '),>tbody >tr >td:nth-child(' + columnIndexInTable + ')')
                    .hide();
            } else if (field.visibility == 'hidden' && visibility != 'hidden') {
                this._$table
                    .find('>thead >tr >th:nth-child(' + columnIndexInTable + '),>tbody >tr >td:nth-child(' + columnIndexInTable + ')')
                    .show()
                    .css('display', 'table-cell');
            }

            field.visibility = visibility;
        },

        /* Prepares dialog to change settings.
         *************************************************************************/
        _createColumnSelection: function () {
            let self = this;

            if (!self.options.columnSelectable) {
                return;
            }

            // Create a div for dialog and add to container element
            this._$columnSelectionDiv = $('<div />')
                .addClass('jtable-column-selection-container')
                .appendTo(self._$mainContainer)
                .hide();

            this._$table.children('thead').on('contextmenu', function (e) {
                e.preventDefault();

                let main_resized = false;
                // Make an overlay div to disable page clicks
                $('<div />')
                    .addClass('jtable-contextmenu-overlay')
                    .on("click", function () {
                        $(this).remove();
                        self._$columnSelectionDiv.hide();
                        // the next line resizes the main container again
                        if (main_resized) {
                            self._$mainContainer.height("auto");
                        }
                    })
                    .on('contextmenu', function () { return false; })
                    .appendTo(document.body);

                self._fillColumnSelection();

                // Calculate position of column selection list and show it

                let containerOffset = self._$mainContainer.offset();
                let selectionDivTop = e.pageY - containerOffset.top;
                let selectionDivLeft = e.pageX - containerOffset.left;

                let selectionDivMinWidth = 100; // in pixels
                let containerWidth = self._$mainContainer.width();

                // If user clicks right area of header of the table, show list at a little left
                if ((containerWidth > selectionDivMinWidth) && (selectionDivLeft > (containerWidth - selectionDivMinWidth))) {
                    selectionDivLeft = containerWidth - selectionDivMinWidth;
                }

                if (self.options.columnSelectableResizeMain) {
                    // the next lines of code adapt the main container height so the selection div fits in it without scrollbars
                    let selectionDivBottomY = e.pageY + self._$columnSelectionDiv.outerHeight(true);
                    let mainContainerBottomY = containerOffset.top + self._$mainContainer.outerHeight(true);
                    if (mainContainerBottomY<selectionDivBottomY) {
                        self._$mainContainer.height(self._$mainContainer.outerHeight(true)+selectionDivBottomY-mainContainerBottomY);
                        main_resized = true;
                    }
                }

                self._$columnSelectionDiv.css({
                    left: selectionDivLeft,
                    top: selectionDivTop,
                    'min-width': selectionDivMinWidth + 'px'
                }).show();
            });
        },

        /* Prepares content of settings dialog.
         *************************************************************************/
        _fillColumnSelection: function () {
            let self = this;

            let $columnsUl = $('<ul></ul>')
                .addClass('jtable-column-select-list');
            for (let i = 0; i < self._columnList.length; i++) {
                let columnName = self._columnList[i];
                let field = self.options.fields[columnName];

                let isSortedField = false;
                if (self.options.sorting) {
                    $.each(self._lastSorting, function (sortIndex, sortField) {
                        if (sortField.fieldName == columnName) {
                            isSortedField = true;
                        }
                    });
                }

                // Create li element
                let $columnLi = $('<li></li>').appendTo($columnsUl);

                // Create label for the checkbox
                let $label = $('<label></label>')
                    .append($('<span>' + (field.title || columnName) + '</span>'))
                    .appendTo($columnLi);

                if (field.visibility != 'separator') {
                    // Create checkbox
                    let $checkbox = $('<input type="checkbox" id="' + columnName + '">')
                        .prependTo($label)
                        .on("click", function () {
                            let clickedColumnName = $(this).attr('id');
                            let clickedField = self.options.fields[clickedColumnName];
                            if (clickedField.visibility == 'fixed') {
                                return;
                            } else if (clickedField.visibility != 'hidden' && isSortedField) {
                                // you can't hide a field on which a sort is done, but you can show it if it was hidden
                                return;
                            }
                            self.changeColumnVisibility(clickedColumnName, $(this).prop('checked') ? 'visible' : 'hidden');
                        });

                    // Check, if column if shown
                    if (field.visibility != 'hidden') {
                        $checkbox.prop('checked', true);
                    }

                    // Disable, if column is fixed
                    if (field.visibility == 'fixed') {
                        $checkbox.attr('disabled', 'disabled');
                    } else if (field.visibility != 'hidden' && isSortedField) {
                        $checkbox.attr('disabled', 'disabled');
                    }
                }
            }

            this._$columnSelectionDiv.html($columnsUl);
        },

        /* creates a vertical bar that is shown while resizing columns.
         *************************************************************************/
        _createColumnResizeBar: function () {
            this._$columnResizeBar = $('<div />')
                .addClass('jtable-column-resize-bar')
                .appendTo(this._$mainContainer)
                .hide();
        },

        /* Makes a column resizable.
         *************************************************************************/
        _makeColumnResizable: function ($columnHeader) {
            let self = this;

            // Create a handler to handle mouse click event
            $('<div />')
                .addClass('jtable-column-resize-handler')
                .appendTo($columnHeader.find('.jtable-column-header-container')) // Append the handler to the column
                .on("click", function (e) { // reset/prevent click event from parent th, otherwise unwanted sorting can happen
                    e.preventDefault();
                    e.stopPropagation();
                })
                .mousedown(function (downevent) { // handle mousedown event for the handler
                    downevent.preventDefault();
                    downevent.stopPropagation();

                    let mainContainerOffset = self._$mainContainer.offset();

                    // Get a reference to the next column
                    let $nextColumnHeader = $columnHeader.nextAll('th.jtable-column-header:visible:first');
                    if ($nextColumnHeader.length) {
                        let nextfieldname =  $nextColumnHeader.data('fieldName');
                        if (!self.options.fields[nextfieldname].columnResizable) {
                            $nextColumnHeader = undefined;
                        }
                    }
                    if ($nextColumnHeader) {
                        nextColumnOuterWidth=$nextColumnHeader.outerWidth();
                    } else {
                        nextColumnOuterWidth=0;
                    }

                    // Store some information to be used on resizing
                    let minimumColumnWidth = 10; // A column's width can not be smaller than 10 pixel.
                    self._currentResizeArgs = {
                        currentColumnStartWidth: $columnHeader.outerWidth(),
                        minWidth: minimumColumnWidth,
                        maxWidth: $columnHeader.outerWidth() + nextColumnOuterWidth,
                        mouseStartX: downevent.pageX,
                        minResizeX: function () { return this.mouseStartX - (this.currentColumnStartWidth - this.minWidth); },
                        maxResizeX: function () { return this.mouseStartX + (this.maxWidth - this.currentColumnStartWidth); }
                    };

                    // Handle mouse move event to move resizing bar
                    let resizeonmousemove = function (moveevent) {
                        if (!self._currentResizeArgs) {
                            return;
                        }

                        let resizeBarX = self._normalizeNumber(moveevent.pageX, self._currentResizeArgs.minResizeX(), self._currentResizeArgs.maxResizeX());
                        self._$columnResizeBar.css('left', (resizeBarX - mainContainerOffset.left) + 'px');
                    };

                    // Handle mouse up event to finish resizing of the column
                    let resizeonmouseup = function (upevent) {
                        if (!self._currentResizeArgs) {
                            return;
                        }

                        $(document).off('mousemove', resizeonmousemove);
                        $(document).off('mouseup', resizeonmouseup);

                        self._$columnResizeBar.hide();

                        // Calculate new widths in pixels
                        let mouseChangeX = upevent.pageX - self._currentResizeArgs.mouseStartX;
                        if (mouseChangeX != 0) {
                            let currentColumnFinalWidth = self._normalizeNumber(self._currentResizeArgs.currentColumnStartWidth + mouseChangeX, self._currentResizeArgs.minWidth, self._currentResizeArgs.maxWidth);

                            // Now resize the column by setting width
                            // Calculate widths as percent
                            let pixelToPercentRatio = $columnHeader.data('width-in-percent') / self._currentResizeArgs.currentColumnStartWidth;
                            let width_diff = self._roundNumber( currentColumnFinalWidth * pixelToPercentRatio) - $columnHeader.data('width-in-percent') ;
                            $columnHeader.data('width-in-percent', $columnHeader.data('width-in-percent') + width_diff);
                            // Set new widths to columns (resize!)
                            $columnHeader.css('width', $columnHeader.data('width-in-percent') + '%');

                            // now do the same for the next column if present
                            if ($nextColumnHeader) {
                                $nextColumnHeader.data('width-in-percent', $nextColumnHeader.data('width-in-percent') - width_diff);
                                $nextColumnHeader.css('width', $nextColumnHeader.data('width-in-percent') + '%');
                            }

                            // Normalize all column widths, since the wanted percentages might not be the real ones
                            self._normalizeColumnWidths();

                            // Save current preferences
                            if (self.options.saveUserPreferences) {
                                self._saveColumnSettings();
                            }
                        }

                        // Finish resizing
                        self._currentResizeArgs = null;
                    };

                    // Show vertical resize bar
                    self._$columnResizeBar
                        .show()
                        .css({
                            top: ($columnHeader.offset().top - mainContainerOffset.top) + 'px',
                            left: (downevent.pageX - mainContainerOffset.left) + 'px',
                            height: (self._$table.outerHeight()) + 'px'
                        });

                    // Bind events
                    $(document).on('mousemove', resizeonmousemove);
                    $(document).on('mouseup', resizeonmouseup);
                });
        },

        /* Normalizes column widths as percent for current view.
         *************************************************************************/
        _normalizeColumnWidths: function () {
            let self = this;
            const $table = self._$table;

            const $allHeaderCells = $table.find('>thead th');
            const $commandColumns = $allHeaderCells.filter('.jtable-command-column-header');
            const $regularColumns = $allHeaderCells.not('.jtable-command-column-header');
            const totalWidth = $table.outerWidth();

            // 1. Set minimal width for command columns
            $commandColumns.each(function () {
                const $cell = $(this);
                // first we set it super small (too small)
                // // 0% is not allowed, FF takes that as "auto"
                $cell.css('width', '1%');
            });

            // 2. Get all visible regular columns
            const $visibleRegularColumns = $regularColumns.filter(':visible');
            if (!$visibleRegularColumns.length) return;

            // 3. Assign percentage widths based on visible size
            $visibleRegularColumns.each(function () {
                const $cell = $(this);
                const widthPercent = $cell.outerWidth() * 100 / totalWidth;
                const roundedWidthPercent = self._roundNumber(widthPercent);
                $cell.data('width-in-percent', roundedWidthPercent).css('width', roundedWidthPercent + '%');
            });

            // 4. Set minimal width for hidden regular columns
            $regularColumns.not(':visible').each(function () {
                $(this).data('width-in-percent', 1).css('width', '1%');
            });
        },

        /* Saves field setting to cookie.
         *  Saved setting will be a string like that:
         * fieldName1=visible;23|fieldName2=hidden;17|...
         *************************************************************************/
        _saveColumnSettings: function () {
            let self = this;

            let fieldSettings = '';
            self._$table.find('>thead >tr >th.jtable-column-header').each(function () {
                let $cell = $(this);
                    let fieldName = $cell.data('fieldName');
                    let columnWidth = $cell.data('width-in-percent');
                    let fieldVisibility = self.options.fields[fieldName].visibility;
                    let fieldSetting = fieldName + "=" + fieldVisibility + ';' + columnWidth;
                    fieldSettings = fieldSettings + fieldSetting + '|';
            });

            this._setUserPref('column-settings', fieldSettings.substr(0, fieldSettings.length - 1));
        },

        /* Loads field settings from cookie that is saved by _saveColumnSettings method.
         *************************************************************************/
        _loadColumnSettings: function () {
            let self = this;

            let columnSettingsUserPref = self._getUserPref('column-settings');
            if (columnSettingsUserPref == null) {
                return;
            }
            if (!columnSettingsUserPref) { // empty cookie? Remove it
                self._removeUserPref('column-settings');
                return;
            }

            let columnSettings = {};
            $.each(columnSettingsUserPref.split('|'), function (inx, fieldSetting) {
                let splitted = fieldSetting.split('=');
                let fieldName = splitted[0];
                let settings = splitted[1].split(';');
                let columnVisibility = settings[0];
                let columnWidth = settings[1];
                if ($.inArray(fieldName,self._fieldList) > -1) {
                    if ( self.options.fields[fieldName].visibility != 'fixed' && self.options.fields[fieldName].visibility != 'separator') {
                        self.options.fields[fieldName].visibility = columnVisibility;
                    }
                    if (self.options.columnResizable) {
                        let allow_resize = (self.options.fields[fieldName].columnResizable != false);
                        if ( allow_resize && !isNaN(columnWidth) ) {
                            self.options.fields[fieldName].width = columnWidth + "%";
                        }
                    }
                }
            });
        }

    });

})(jQuery);


/************************************************************************
 * MASTER/CHILD tables extension for jTable                              *
 *************************************************************************/
(function ($) {

    // Reference to base object members
    let base = {
        _removeRowsFromTable: jTable.prototype._removeRowsFromTable
    };

    // extension members
    $.extend(true, jTable.prototype, {

        /************************************************************************
         * DEFAULT OPTIONS / EVENTS                                              *
         *************************************************************************/
        options: {
            openChildAsAccordion: false
        },

        /************************************************************************
         * PUBLIC METHODS                                                        *
         *************************************************************************/

        /* Creates and opens a new child table for given row.
         *************************************************************************/
        openChildTable: function ($row, tableOptions, opened) {
            let self = this;

            // Apply theming as same as parent table unless explicitily set
            if (tableOptions.jqueryuiTheme == undefined) {
                tableOptions.jqueryuiTheme = self.options.jqueryuiTheme;
            }

            // Show close button as default
            tableOptions.showCloseButton = (tableOptions.showCloseButton != false);

            // Close child table when close button is clicked (default behavior)
            if (tableOptions.showCloseButton && !tableOptions.closeRequested) {
                tableOptions.closeRequested = function () {
                    self.closeChildTable($row);
                };
            }

            // If accordion style, close open child table (if it does exists)
            if (self.options.openChildAsAccordion) {
                $row.siblings('.jtable-data-row').each(function () {
                    self.closeChildTable($(this));
                });
            }

            // Close child table for this row and open new one for child table
            self.closeChildTable($row, function () {
                let $childRowColumn = self.getChildRow($row).children('td').empty();
                let $childTableContainer = $('<div />')
                    .addClass('jtable-child-table-container')
                    .appendTo($childRowColumn);
                $childRowColumn.data('childTable', $childTableContainer);
                $childTableContainer.jtable(tableOptions);
                self.openChildRow($row);
                $childTableContainer.hide().slideDown('fast', function () {
                    if (opened) {
                        opened({
                            childTable: $childTableContainer
                        });
                    }
                });
            });
        },

        /* Closes child table for given row.
         *************************************************************************/
        closeChildTable: function ($row, closed) {
            let self = this;

            let $childRowColumn = self.getChildRow($row).children('td');
            let $childTable = $childRowColumn.data('childTable');
            if (!$childTable) {
                if (closed) {
                    closed();
                }

                return;
            }

            $childRowColumn.data('childTable', null);
            $childTable.slideUp('fast', function () {
                $childTable.jtable('destroy');
                $childTable.remove();
                self.closeChildRow($row);
                if (closed) {
                    closed();
                }
            });
        },

        /* Returns a boolean value indicates that if a child row is open for given row.
         *************************************************************************/
        isChildRowOpen: function ($row) {
            return (this.getChildRow($row).is(':visible'));
        },

        /* Gets child row for given row, opens it if it's closed (Creates if needed).
         *************************************************************************/
        getChildRow: function ($row) {
            return $row.data('childRow') || this._createChildRow($row);
        },

        /* Creates and opens child row for given row.
         *************************************************************************/
        openChildRow: function ($row) {
            let $childRow = this.getChildRow($row);
            if (!$childRow.is(':visible')) {
                $childRow.show();
            }

            return $childRow;
        },

        /* Closes child row if it's open.
         *************************************************************************/
        closeChildRow: function ($row) {
            let $childRow = this.getChildRow($row);
            if ($childRow.is(':visible')) {
                $childRow.hide();
            }
        },

        /************************************************************************
         * OVERRIDED METHODS                                                     *
         *************************************************************************/

        /* Overrides _removeRowsFromTable method to remove child rows of deleted rows.
         *************************************************************************/
        _removeRowsFromTable: function ($rows, reason) {
            //let self = this;

            if (reason == 'deleted') {
                $rows.each(function () {
                    let $row = $(this);
                    let $childRow = $row.data('childRow');
                    if ($childRow) {
                        //self.closeChildTable($row); // Removed since it causes "Uncaught Error: cannot call methods on jtable prior to initialization; attempted to call method 'destroy'"
                        $childRow.remove();
                    }
                });
            }

            base._removeRowsFromTable.apply(this, arguments);
        },

        /************************************************************************
         * PRIVATE METHODS                                                       *
         *************************************************************************/

        /* Creates a child row for a row, hides and returns it.
         *************************************************************************/
        _createChildRow: function ($row) {
            let totalColumnCount = this._$table.find('thead th').length;
            let $childRow = $('<tr></tr>')
                .addClass('jtable-child-row')
                .append('<td colspan="' + totalColumnCount + '"></td>');
            $row.after($childRow);
            $row.data('childRow', $childRow);
            $childRow.hide();
            return $childRow;
        }

    });

})(jQuery);


/************************************************************************
 * toolbar search extension for jTable                                   *
 *************************************************************************/
(function ($) {
    // Reference to base object members
    let base = {
        _addRowToTableHead: jTable.prototype._addRowToTableHead
    };

    // extension members
    $.extend(true, jTable.prototype, {
        options: {
            toolbarsearch:false,
            toolbarreset:true
        },
        /** Overrides Method
        /* Adds tr element to given thead element
         *************************************************************************/
        _addRowToTableHead: function ($thead) {
            base._addRowToTableHead.apply(this, arguments);
            if(this.options.toolbarsearch){			
                let $tr = $('<tr></tr>')
                    .appendTo($thead);
                this._toolbarsearch_addColumnsToHeaderRow($tr);
            }

        },
        /* Adds column header cells to given tr element.
         *************************************************************************/
        _toolbarsearch_addColumnsToHeaderRow: function ($tr) {
            let self = this;
            if(this.options.selecting && this.options.selectingCheckboxes){
                $tr.append('<th/>');	
            }
            for (let i = 0; i < this._columnList.length; i++) {
                let fieldName = this._columnList[i];
                let $headerCell = this._toolbarsearch_createHeaderCellForField(fieldName, this.options.fields[fieldName]);
                $headerCell.appendTo($tr);
            }

            let actions = ['deleteAction', 'cloneAction', 'updateAction'];
            let $actioncount = 0;
            actions.forEach(action => {
                if (this.options.actions[action]) {
                    $actioncount += 1;
                }
            });

            let $reset = $('<th></th>')
                .addClass('jtable-toolbarsearch-reset');
            if ($actioncount) {
                $reset.attr('colspan',$actioncount);
            } else {
                // no action buttons defined, then we act as if this is a column header to at least prevent it from being too wide
                $reset.addClass('jtable-command-column-header');
            }

            if (this.options.toolbarreset) {
                // we add the reset button if wanted, even if no other actions are defined (so $actioncount=0)
                $resetbutton = $('<input type="button" class="jtable-toolbarsearch-reset-button" value="Reset"/>').appendTo($reset);
                $resetbutton.click(function(){
                    $('.jtable-toolbarsearch').val('');
                    $('.jtable-toolbarsearch-extra').val('');
                    self.load({});				
                });
            }
            // now add the search row itself
            $tr.append($reset);
        },		

        /* Creates a header cell for given field.
         *  Returns th jQuery object.
         *************************************************************************/		
        _toolbarsearch_createHeaderCellForField: function (fieldName, field) {
            let self = this;
            if(typeof field.searchable === 'undefined'){
                field.searchable = true;
            };
            field.width = field.width || '10%'; //default column width: 10%.

            let $input = $('<input id="jtable-toolbarsearch-' + fieldName + '" type="' + field.type  + '"/>')
                .addClass('jtable-toolbarsearch')
                .css('width','90%');
            let $realInput = $input;

            if (field.type=="date") {
                if (typeof $.fn.fdatepicker == 'function') {
                    let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                    let dateLocale = field.dateLocale || this.options.defaultDateLocale;

                    $input = $('<div>');
                    // Create hidden input
                    $realInput = $('<input>', { class: 'jtable-toolbarsearch-extra', id: 'jtable-toolbarsearch-extra-' + fieldName, type: 'hidden', name: fieldName });
                    let $visibleInput = $('<input>', { class: 'jtable-toolbarsearch', id: 'jtable-toolbarsearch-' + fieldName, type: 'text', name: 'alt-' + fieldName, }).css('width','90%');
                    $input.append($realInput, $visibleInput);

                    // Initialize datepicker on the visible input
                    $visibleInput.fdatepicker({
                        autoClose: true,
                        todayButton: new Date(),
                        clearButton: true,
                        closeButton: true,
                        language: dateLocale,
                        dateFormat: dateFormat,
                        altFieldDateFormat: 'Y-m-d',
                        altField: '#jtable-toolbarsearch-extra-' + fieldName  // This should point to the hidden input's ID
                    });
                } else if (typeof $.fn.flatpickr == 'function') {
                    let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                    let dateLocale = field.dateLocale || this.options.defaultDateLocale;

                    $input = $('<div>');
                    // Single input (Flatpickr will convert this to hidden and create its own altInput)
                    $realInput = $('<input>', {
                        id: 'jtable-toolbarsearch-extra-' + fieldName,
                        name: fieldName,
                        type: 'text',  // Flatpickr will change this to 'hidden'
                        class: 'jtable-toolbarsearch-extra'
                    });

                    $input.append($realInput);
                    // Initialize Flatpickr
                    let fp = flatpickr($realInput, {
                        dateFormat: 'Y-m-d',
                        altInput: true,
                        altFormat: dateFormat,
                        locale: dateLocale
                    });

                } else if (typeof $.fn.datepicker == 'function') {
                    let dateFormat = field.dateFormat || this.options.defaultDateFormat;
                    let dateLocale = field.dateLocale || this.options.defaultDateLocale;
                    $input = $('<div>');
                    // Create hidden input
                    $realInput = $('<input>', { class: 'jtable-toolbarsearch-extra', id: 'jtable-toolbarsearch-extra-' + fieldName, type: 'hidden', name: fieldName });
                    let $visibleInput = $('<input>', { class: 'jtable-toolbarsearch', id: 'jtable-toolbarsearch-' + fieldName, type: 'text', name: 'alt-' + fieldName, }).css('width','90%');
                    $input.append($realInput, $visibleInput);

                    // Initialize datepicker on the visible input
                    if (dateLocale && $.datepicker.regional[dateLocale]) {
                        $.datepicker.setDefaults($.datepicker.regional[dateLocale]);
                    }
                    $visibleInput.datepicker({
                        changeYear: true,yearRange: "-100:+1",numberOfMonths: 3, showButtonPanel: true,
                        dateFormat: dateFormat,
                        altFormat: 'Y-m-d',
                        altField: '#jtable-toolbarsearch-extra-' + fieldName  // This should point to the hidden input's ID
                    });
                } else {
                    $input = $('<input id="jtable-toolbarsearch-' + fieldName + '" type="date"/>')
                        .addClass('jtable-toolbarsearch')
                        .css('width','90%');
                    $realInput = $input;
                }
            } else if (field.type=='checkbox' && field.values) {
                $input = $('<select class="" id="jtable-toolbarsearch-' + fieldName +'"></select>')
                    .addClass('jtable-toolbarsearch')
                    .css('width','90%');
                // we use the spread (...) operator to force a copy of the array, so our unshift won't change the original
                let options = [...this._createCheckBoxStateArrayForField(fieldName)];
                // Only add empty option if first option isn't already empty
                if (options.length === 0 || options[0].Value !== "") {
                    options.unshift({ "Value": "", "DisplayText": "" });
                }
                this._fillDropDownListWithOptions($input, options, '');
                $realInput = $input;
            } else if (field.options) {
                $input = $('<select class="" id="jtable-toolbarsearch-' + fieldName +'"></select>')
                    .addClass('jtable-toolbarsearch')
                    .css('width','90%');
                // we use the spread (...) operator to force a copy of the array, so our unshift won't change the original
                let options = [...this._getOptionsForField(fieldName, {})];
                // Only add empty option if first option isn't already empty
                if (options.length === 0 || options[0].Value !== "") {
                    options.unshift({ "Value": "", "DisplayText": "" });
                }
                this._fillDropDownListWithOptions($input, options, '');
                $realInput = $input;
            } else if (field.toolbaroptions) {
                $input = $('<select class="" id="jtable-toolbarsearch-' + fieldName +'"></select>')
                    .addClass('jtable-toolbarsearch')
                    .css('width','90%');
                // we use the spread (...) operator to force a copy of the array, so our unshift won't change the original
                let options = [...this._getOptionsForField(fieldName, {}, 'toolbaroptions')];
                // Only add empty option if first option isn't already empty
                if (options.length === 0 || options[0].Value !== "") {
                    options.unshift({ "Value": "", "DisplayText": "" });
                }
                this._fillDropDownListWithOptions($input, options, '');
                $realInput = $input;
            };

            $realInput.on('change', function() {
                let queries = [];
                let searchOptions = [];

                $('.jtable-toolbarsearch').each(function() {
                    if (!$(this).attr('id')) {
                        return;
                    }
                    let fieldName = $(this).attr('id').replace('jtable-toolbarsearch-', '');
                    if ($(this).val().trim().length >= 1) {
                        searchOptions.push(fieldName);
                        queries.push($(this).val());
                    }
                });
                $('.jtable-toolbarsearch-extra').each(function() {
                    if (!$(this).attr('id')) {
                        return;
                    }
                    let fieldName = $(this).attr('id').replace('jtable-toolbarsearch-extra-', '');
                    if ($(this).val().trim().length >= 1) {
                        searchOptions.push(fieldName);
                        queries.push($(this).val());
                    }
                });

                self.load({ 'q[]': queries, 'opt[]': searchOptions });
                self._$mainContainer.trigger("toolbarsearch", { 'q[]': queries, 'opt[]': searchOptions });
            });

            let $headerContainerDiv = $('<div />')
                .addClass('jtable-column-header-container');

            if(field.searchable){	
                $headerContainerDiv.append($input);
            }

            let $th = $('<th></th>')
                .addClass('jtable-column-header')
                .css('width', field.width)
                .data('fieldName', fieldName)
                .append($headerContainerDiv);

            //hide the table header if the corresponding field is hidden
            if(field.visibility==='hidden'){
                $th.hide();
            }

            return $th;
        }
    });

})(jQuery);

