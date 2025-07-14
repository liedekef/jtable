/** JTABLE Multiple toolbar search extension 

 **/
(function ($) {
    var base={
        _addRowToTableHead: jTable.prototype._addRowToTableHead
    }
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
                var $tr = $('<tr></tr>')
                    .appendTo($thead);
                this._toolbarsearch_addColumnsToHeaderRow($tr);
            }

        },
        /* Adds column header cells to given tr element.
         *************************************************************************/
        _toolbarsearch_addColumnsToHeaderRow: function ($tr) {
            var self = this;
            if(this.options.selecting && this.options.selectingCheckboxes){
                $tr.append('<th/>');	
            }
            for (var i = 0; i < this._columnList.length; i++) {
                var fieldName = this._columnList[i];
                var $headerCell = this._toolbarsearch_createHeaderCellForField(fieldName, this.options.fields[fieldName]);
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
                $tr.append($reset);
            } else if ($actioncount) {
                $tr.append($reset);
            }
        },		

        /* Creates a header cell for given field.
         *  Returns th jQuery object.
         *************************************************************************/		
        _toolbarsearch_createHeaderCellForField: function (fieldName, field) {
            var self = this;
            if(typeof field.searchable === 'undefined'){
                field.searchable = true;
            };
            field.width = field.width || '10%'; //default column width: 10%.

            var $input = $('<input id="jtable-toolbarsearch-' + fieldName + '" type="text"/>')
                .addClass('jtable-toolbarsearch')
                .css('width','90%');

            if (field.type=="date") {
                if (typeof $.fn.fdatepicker == 'function') {
                    let displayFormat = field.displayFormat || this.options.defaultDateFormat;

		    $container = $('<div>');
                    // Create hidden input
                    $hiddenInput = $('<input>', { class: 'jtable-toolbarsearch-extra', id: 'jtable-toolbarsearch-extra-' + fieldName, type: 'hidden', name: fieldName });
                    let $visibleInput = $('<input>', { class: 'jtable-toolbarsearch', id: 'jtable-toolbarsearch-' + fieldName, type: 'text', name: 'alt-' + fieldName, }).css('width','90%');
                    $container.append($hiddenInput, $visibleInput);

                    // Initialize datepicker on the visible input
                    $visibleInput.fdatepicker({
                        autoClose: true,
                        todayButton: new Date(),
                        clearButton: true,
                        closeButton: true,
                        dateFormat: displayFormat,
                        altFieldDateFormat: 'Y-m-d',
                        altField: '#jtable-toolbarsearch-extra-' + fieldName  // This should point to the hidden input's ID
                    });
                    $input=$container;
                } else if (typeof $.fn.datepicker == 'function') {
                    var displayFormat = field.displayFormat || this.options.defaultDateFormat;
                    $input.datepicker({ dateFormat: displayFormat,changeMonth: true,
                        changeYear: true,yearRange: "-100:+1",numberOfMonths: 3,
                        showButtonPanel: true});
                } else {
                    $input = $('<input id="jtable-toolbarsearch-' + fieldName + '" type="date"/>')
                        .addClass('jtable-toolbarsearch')
                        .css('width','90%');
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
            };

            $input.on('change', function() {
                var queries = [];
                var searchOptions = [];

                $('.jtable-toolbarsearch').each(function() {
                    var fieldName = $(this).attr('id').replace('jtable-toolbarsearch-', '');
                    if ($(this).val().trim().length >= 1) {
                        searchOptions.push(fieldName);
                        queries.push($(this).val());
                    }
                });
                $('.jtable-toolbarsearch-extra').each(function() {
                    var fieldName = $(this).attr('id').replace('jtable-toolbarsearch-extra-', '');
                    if ($(this).val().trim().length >= 1) {
                        searchOptions.push(fieldName);
                        queries.push($(this).val());
                    }
                });

                self.load({ 'q[]': queries, 'opt[]': searchOptions });
            });

            var $headerContainerDiv = $('<div />')
                .addClass('jtable-column-header-container');

            if(field.searchable){	
                $headerContainerDiv.append($input);
            }

            var $th = $('<th></th>')
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

