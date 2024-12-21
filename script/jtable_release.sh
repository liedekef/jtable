#/bin/bash

release=$1
if [ -z "$release" ]; then
       echo "Usage: $0 <old version number> <new version number>"
       exit
fi       

# now update the release version
scriptpath=$(realpath "$0")
scriptdir=$(dirname $scriptpath)
basedir=$(dirname $scriptdir)

$scriptdir/update_css.sh
$scriptdir/jtable_minify.sh
echo $release >$basedir/VERSION

# now create a zip of the new release
cd $basedir/..
pwd
zip -r jtable.zip jtable -x '*.git*' '*.less' -x 'jtable/dist*' -x 'jtable/script*' -x 'jtable/*json' -x 'jtable/.npmignore' -x 'jtable/themes/update_css.sh'
mv jtable.zip $basedir/dist/

cd $basedir
git add VERSION jquery.jtable.min.js
git commit -m "release $release" -a
git push
gh release create "v${release}" --generate-notes ./dist/*.zip
