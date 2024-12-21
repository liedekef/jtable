#/bin/bash

# now update the release version
scriptpath=$(realpath "$0")
scriptdir=$(dirname $scriptpath)
basedir=$(dirname $scriptdir)
cd $basedir

uglifyjs -o jquery.jtable.min.js jquery.jtable.js
