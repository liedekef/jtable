#!/bin/bash

for i in `find . -name '*.less'|grep -v base.less`; do
    basedir=`dirname $i`
    basefile=`basename $i .less`
    lessc -ru=all $i > $basedir/$basefile.css
    lessc -ru=all -x $i > $basedir/$basefile.min.css
done
