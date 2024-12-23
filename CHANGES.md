By Franky Van Liedekerke:

Version 1.0.6 (2025//)
* Included PR https://github.com/volosoft/jtable/pull/2246
* Included PR https://github.com/volosoft/jtable/pull/1931
* Made Date-field a HTML5 date-field. The old datepicker can be restored using DateJS as type
* remove deprecated method `_addRowToTable` and renamed `_addRow` to `_addRowToTable`

Version 1.0.5 (2024/12/21)
* roomForSortableIcon is true by default, set to false to regain old behavior
* added some margin around the edit/delete/close icon
* allow last column to be resized too

Version 1.0.4 (2024/12/21)
* Add option "roomForSortableIcon" (true/false) for sorting, so the icon has room to appear next to the next

Version 1.0.2 (2024/12/20)
* rewritten without jquery-ui
* fully use html5 modals
* visibility can be "hidden", "visible" (the default), or "separator" (in
which case the value will be bold, but not selectable nor a real column, just
a bold-entry in the vibility selection)
* added div around the internal table, using css this is now responsive (css included in all themes):
```js
.jtable-table-div {
    display: block;
    overflow-x:auto;
}
.jtable-table-div > table {
    overflow:hidden;
}
```
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
