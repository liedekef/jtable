#/bin/bash

# now update the release version
scriptpath=$(realpath "$0")
scriptdir=$(dirname $scriptpath)
basedir=$(dirname $scriptdir)
cd $basedir

uglifyjs -o jquery.jtable.min.js jquery.jtable.js
cd extensions
uglifyjs -o jquery.jtable.aspnetpagemethods.min.js jquery.jtable.aspnetpagemethods.js
uglifyjs -o jquery.jtable.localstorage.min.js jquery.jtable.localstorage.js
uglifyjs -o jquery.jtable.record-actions.min.js jquery.jtable.record-actions.js
uglifyjs -o jquery.jtable.toolbarsearch.min.js jquery.jtable.toolbarsearch.js
