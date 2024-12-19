* visibility can be "hidden", "visible" (the default), or "separator" (in
which case the value will be bold, but not selectable nor a real column, just
a bold-entry in the vibility selection)
* added div around the internal table, using css this is now responsive:
```js
.jtable-table-div {
    display: block;
    overflow-x:auto;
}
.jtable-table-div > table {
    overflow:hidden;
}
```
* the dialog is styled like this:
```
.jtable-modal-dialog {
    display: none;
    position: fixed;
    z-index: 1000;
    background-color: #fff;
    border: 1px solid #ccc;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    width: fit-content;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
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
* rewritten without jquery-ui
