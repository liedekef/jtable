#!/bin/bash

# npm install less -g
# npm install less-plugin-clean-css -g

scriptpath=$(realpath "$0")
scriptdir=$(dirname $scriptpath)

cd $scriptdir/../themes

for i in `find . -name '*.less'|grep -v base.less`; do
    basedir=`dirname $i`
    basefile=`basename $i .less`
    echo "compiling $i"
    lessc -ru=all $i > $basedir/$basefile.css
    echo "compiling and minifying $i"
    lessc -ru=all -clean-css $i > $basedir/$basefile.min.css
done
