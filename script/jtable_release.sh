#/bin/bash

old_release=$1
release=$2
if [ -z "$release" ]; then
       echo "Usage: $0 <old version number> <new version number>"
       exit
fi       

# now update the release version
scriptpath=$(realpath "$0")
scriptdir=$(dirname $scriptpath)
basedir=$(dirname $scriptdir)
cd $basedir
sed -i "s/$old_release/$release/" jquery.jtable.js
sed -i "s/$old_release/$release/" CHANGES.md

# now create a zip of the new release
cd $basedir/..
pwd
zip -r jtable.zip jtable -x '*.git*' '*.less' -x 'jtable/dist*' -x 'jtable/script*' -x 'jtable/*json' -x 'jtable/.npmignore' -x 'jtable/themes/update_css.sh'
mv jtable.zip $basedir/dist/

cd $basedir
git commit -m "release $release" -a
git push
gh release create "v${release}" --generate-notes ./dist/*.zip
