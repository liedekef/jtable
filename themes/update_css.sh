#!/bin/bash

for i in `find . -name '*.less'|grep -v base.less`; do
    basedir=`dirname $i`
    basefile=`basename $i .less`
    lessc $i > $basedir/$basefile.css
    lessc -x $i > $basedir/$basefile.min.css
done
