#/bin/bash

old_release=$1
release=$2
if [ -z "$release" ]; then
       echo "Usage: $0 <old version number> <new version number>"
       exit
fi       

# Set up paths
scriptpath=$(realpath "$0")
scriptdir=$(dirname $scriptpath)
basedir=$(dirname $scriptdir)

# Update/minify CSS and JS
$scriptdir/update_css.sh
$scriptdir/jtable_minify.sh

# Update version file, JS header, and package.json
echo $release >$basedir/VERSION
sed -i "s/jTable $old_release/jTable $release/" jquery.jtable.js

# --- NPM: update version and publish ---
if [ -f "$basedir/package.json" ]; then
    # Update package.json version (no git tag, since we'll handle it manually)
    npm version $release --no-git-tag-version

    # Publish to npm (scoped package, so --access public)
    npm publish --access public
fi

# --- GitHub release steps as before ---
# Create a zip of the new release for GitHub (but not for npm)
cd $basedir/..
pwd
zip -r jtable.zip jtable -x '*.git*' '*.less' -x 'jtable/dist*' -x 'jtable/script*' -x 'jtable/*json' -x 'jtable/.npmignore' -x 'jtable/themes/update_css.sh'
mv jtable.zip $basedir/dist/

cd $basedir
git add VERSION jquery.jtable.min.js package.json
git commit -m "release $release" -a
git push
gh release create "v${release}" --generate-notes ./dist/*.zip