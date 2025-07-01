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
            }

            if (this.options.toolbarreset) {
                // we add the reset button if wanted, even if no other actions are defined (so $actioncount=0)
                $resetbutton = $('<input type="button" class="jtable-toolbarsearch-reset-button" value="Reset"/>').appendTo($reset);
                $resetbutton.click(function(){
                    $('.jtable-toolbarsearch').val('');
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
                if (typeof $.fn.datepicker == 'function') {
                    var displayFormat = field.displayFormat || this.options.defaultDateFormat;
                    $input.datepicker({ dateFormat: displayFormat,changeMonth: true,
                        changeYear: true,yearRange: "-100:+1",numberOfMonths: 3,
                        showButtonPanel: true});
                } else {
                    $input = $('<input id="jtable-toolbarsearch-' + fieldName + '" type="date"/>')
                        .addClass('jtable-toolbarsearch')
                        .css('width','90%');
                }
            } else if (field.options) {
                $input = $('<select class="" id="jtable-toolbarsearch-' + fieldName +'"></select>')
                    .addClass('jtable-toolbarsearch')
                    .css('width','90%');
                // we use the spread (...) operator to force a copy of the array, so our unshift won't change the original
                let options = [...this._getOptionsForField(fieldName, {})];
                options.unshift({ "Value": "", "DisplayText": "" });
                this._fillDropDownListWithOptions($input, options, '');
            };


            $input.bind('change',function(){
                var $q=[];
                var $opt=[];
                var $postData={};
                var $i =0;
                $('.jtable-toolbarsearch').each(function(){
                    var $id = $(this).attr('id');
                    if($(this).val().length>=1){
                        $opt.push($id.replace('jtable-toolbarsearch-',''));								 
                        $q.push($(this).val());
                        $i++;
                    }
                });
                self.load({'q[]':$q,'opt[]':$opt});
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

