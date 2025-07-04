= 3.0.12 (2025//) =
* Added public methods editRecordByKey and editRecordViaAjax
  Both show the edit dialog if the record is found, see the doc
* Added field options listEscapeHTML and inputEscapeHTML, indicating wether or not you want the list or input value escaped
  Default is false, the old behavior

= 3.0.11 (2025/07/01) =
* Added logLevel option
* The toolbarsearch extension now supports dropdowns
* The file input field is now supported in the modals (not multiple yet)

= 3.0.10 (2025/06/26) =
* Description update
* Table column resizing compatibility with Firefox
 
= 3.0.9 (2025/06/16) =
* Fif for command column widths in firefox

= 3.0.8 (2025/06/15) =
* Setting command columns to their actual pct allows exact column resizing now

= 3.0.7 (2025/06/14) =
* Finally happy with column resizing for hidden tables too

= 3.0.6 (2025/06/12) =
* added field option listClassEntry, which will be applied to regular columns only (not the header row)
* listClass field option is applied to all columns (header/body)

= 3.0.5 (2025/06/12) =
* Add correct number of empty elements to toolbarsearch row, even if no reset is defined

= 3.0.4 (2025/06/12) =
* Finetune column width
* Fix toolbarsearch extension placement of reset button
* added field optionlistClassHeader, which will be applied to header-columns only

= 3.0.3 (2025/06/10) =
* Public method recalcColumnWidths added, can be used if a hidden table becomes visible

= 3.0.2 (2025/06/09) =
* cloneAction added, so a record can be cloned now

= 3.0.1 (2025/06/05) =
* remove some old jqueryUI for add/delete animation effects

= 3.0.0 (2025/06/05) =
* npm release added

= 1.0.53 (2025/05/28) =
* Added options for CSV export and print table

= 1.0.52 (2025/04/27) =
* Uniform function naming for edit/add record

= 1.0.51 (2025/04/23) =
* remove debug console.log

= 1.0.50 (2025/04/23) =
* fix show/hide columns, offset was wrong by 1 due to code reorg
* remove localstorage extension, is now the default
* remove aspnet extension, was ancient stuff

= 1.0.49 (2025/04/22) =
* More code re-org

= 1.0.48 (2025/04/22) =
* re-add event handlers correctly

= 1.0.47 (2025/04/13) =
* Simple check for mobile devices (using useragent) because they don't have a Ctrl-key, so multiSortingCtrlKey is set to false then

= 1.0.46 (2025/04/12) =
* Added message sortingInfoSuffix, default empty. See sortingInfoPrefix

= 1.0.45 (2025/04/12) =
* Ctrl-click is the default again for multi-sorting on columns

= 1.0.44 (2025/04/08) =
* Integrated the localstorage extension as standard, thanks to SnrDidcot for the original code

= 1.0.43 (2025/03/08) =
* Added option multiSortingCtrlKey (true/false) to restore old behavior of needing to hold down the Ctrl-key for multi-column sorting

= 1.0.42 (2025/03/08) =
* Added public method resetSorting
* Added option sortingInfoReset (true/false), which will show a button to reset the sorting to its default next to the sorting info
  Only works if sortingInfoSelector is set. Default: true

= older
* Rewritten to use plain jQuery, not jQuery-UI, with HTML5 modal dialogs
* No need to hold CTRL-key for multisorting if it is active
* Removed options: dialogShowEffect, dialogHideEffect
* Removed deprecated private method `_addRowToTable` and rename `_addRow` to `_addRowToTable`
* deleteAction, updateAction and selecting is now only possible if a key-field is defined (makes no sense otherwise)

* Added per-field option "tooltip", which will set the html-title property of that column
* Added public methods deselectRows (Makes row/rows 'deselected') and invertRowSelection (Inverts selection state of a single row)
* Added public method getSortingInfo
* Added option "roomForSortableIcon" (true/false) for sorting, so the sortable icon has room to appear next to the text
  True by default
* Added option "formDialogWidth", which takes a css-width as value, to change the auto-width of the create/edit dialog to something else
* Added option "sortingInfoSelector", which is a jquery selector where the current sorting info will be displayed
  Localized too, message strings and their defaults are:
                sortingInfoPrefix: 'Applied table sorting: '
                ascending: 'Ascending'
                descending: 'Descending'
                sortingInfoNone: 'No table sorting applied'

* If datepicker is not available, the date-type will be considered as a HTML5-date field
* All HTML5 input types are supported as long as they follow the same syntax as type=text for input (so color, range, datetime-local, email, tel, week, month).
* Better logic for resize of columns (resize bar is now full height of header column) and sorting (now sorting goes from nothing => ASC => DESC => nothing)
* Selected sorting order is now also stored (cookie/localstorage) if wanted
* added listQueryParams to jtable-call, to indicate parameters to be loaded on
every load-call, can be a function
  Examples:
```
            listQueryParams: {
                    'action': "eme_people_list",
                    'eme_admin_nonce': emepeople.translate_adminnonce,
			}
```
  Or, if you want data evaluated live:
```
            listQueryParams: function () {
                let params = {
                    'action': "eme_people_list",
                    'eme_admin_nonce': emepeople.translate_adminnonce,
                    'trash': $_GET['trash'],
                    'search_person': $('#search_person').val(),
                    'search_groups': $('#search_groups').val(),
                    'search_memberstatus': $('#search_memberstatus').val(),
                    'search_membershipids': $('#search_membershipids').val(),
                    'search_customfields': $('#search_customfields').val(),
                    'search_customfieldids': $('#search_customfieldids').val(),
                    'search_exactmatch': exactmatch
                }
                return params;
            },
```
  The extra param to the load-call itself will add/override params defined in
  listQueryParams. Example:
```
  $('#PeopleTableContainer').jtable('load', {'test':"eee"});
```
* the queryparams for paging and sorting are now also added to the GET/POST as
regular params, no more forced to the url as GET params
* When the column selection for show/hide columns shows, the main div is resized if not large enough so the selection div fits in it
  The old behaviour can be brought back by setting the option columnSelectableResizeMain to false
* Fixed https://github.com/volosoft/jtable/issues/2277
* Removed a lot of deprecated jquery calls
