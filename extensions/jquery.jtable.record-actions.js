/************************************************************************
* RECORD-ACTIONS extension for jTable                                   *
*************************************************************************/
(function ($) {

    // Reference to base object members
    var base = {
        _initializeFields: jTable.prototype._initializeFields,
        _onRecordsLoaded: jTable.prototype._onRecordsLoaded
    };

    // Extension members
    $.extend(true, jTable.prototype, {

        /*********************************************************************
        * OVERRIDED METHODS                                                  *
        **********************************************************************/

        _initializeFields: function () {
            base._initializeFields.apply(this, arguments);
            
            var self = this;
            self._extraFieldTypes.push({
                type: 'record-actions',
                creator: function(record, field) {
                    return self._createRecordActionsDropdown(record, field);
                }
            });
        },

        _onRecordsLoaded: function () {
            base._onRecordsLoaded.apply(this, arguments);
            
            // Initialize dropdown behavior
            var self = this;
            self._$tableBody.find('.jtable-dropdown-toggle').on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var $toggle = $(this);
                var $menu = $toggle.siblings('.jtable-dropdown-menu');
                var isOpen = $toggle.hasClass('is-open');
                
                // Close all other open menus
                $('.jtable-dropdown-toggle.is-open').not($toggle).removeClass('is-open')
                    .siblings('.jtable-dropdown-menu').removeClass('is-visible');
                
                // Toggle this menu
                $toggle.toggleClass('is-open', !isOpen);
                $menu.toggleClass('is-visible', !isOpen);
            });
            
            // Close menus when clicking outside
            $(document).on('click', function(e) {
                if (!$(e.target).closest('.jtable-dropdown').length) {
                    $('.jtable-dropdown-toggle.is-open').removeClass('is-open')
                        .siblings('.jtable-dropdown-menu').removeClass('is-visible');
                }
            });
        },
        
        /*********************************************************************
        * PRIVATE METHODS                                                    *
        **********************************************************************/

        _createRecordActionsDropdown: function(record, field) {
            var self = this;
            var $dropdownContainer = $('<div class="jtable-dropdown"></div>');
    
            var $dropdownButton = $('<button class="jtable-dropdown-toggle"></button>')
                .html(field.text || 'Actions')
                .attr({
                    'aria-haspopup': 'true',
                    'aria-expanded': 'false'
                });
                
            if (field.cssClass) {
                $dropdownButton.addClass(field.cssClass);
            }

            var $dropdownItemsContainer = $('<ul class="jtable-dropdown-menu"></ul>');
            var hasVisibleItems = false;
            
            field.items.forEach(function(fieldItem) {
                if (fieldItem.visible && !fieldItem.visible({record: record})) {
                    return;
                }
                
                var $dropdownItem = self._createDropdownItem(record, fieldItem);
                if (fieldItem.enabled && !fieldItem.enabled({ record: record })) {
                    $dropdownItem.addClass('is-disabled');
                }
                
                $dropdownItem.appendTo($dropdownItemsContainer);
                hasVisibleItems = true;
            });

            if (hasVisibleItems) {
                $dropdownItemsContainer.appendTo($dropdownContainer);
                $dropdownButton.appendTo($dropdownContainer);
            }
            
            return $dropdownContainer;
        },

        _createDropdownItem: function(record, fieldItem) {
            var $li = $('<li class="jtable-dropdown-item"></li>');
            var $a = $('<a href="#" role="button"></a>').html(fieldItem.text || '');
            
            if (fieldItem.cssClass) {
                $a.addClass(fieldItem.cssClass);
            }

            if (fieldItem.action) {
                $a.on('click', function(e) {
                    e.preventDefault();
                    
                    if (!$li.hasClass('is-disabled')) {
                        fieldItem.action({ record: record });
                        // Close menu after action
                        $li.closest('.jtable-dropdown').find('.jtable-dropdown-toggle')
                            .removeClass('is-open')
                            .attr('aria-expanded', 'false');
                        $li.closest('.jtable-dropdown-menu').removeClass('is-visible');
                    }
                });
            }
            
            return $li.append($a);
        }
    });

})(jQuery);
