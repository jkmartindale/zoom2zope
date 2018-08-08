// Should this be mvoed to GitHub API v4? https://stackoverflow.com/questions/44137710/github-graphql-equivalent-of-the-contents-api
// Consider killing recursion since only Safari seems to do tail end recursion optimization
organization = 'zopefoundation';
extension = '.py';

async function repositoryList(list, url) {
    response = await fetch(url);
    // Just grab repository names
    list = list.concat((await response.json()).map(repository => repository.name));
    try {
        // Recursion seemed natural to me right here ok dont @ me
        return repositoryList(list, response.headers.get('Link').match(/.*<(.*)>; rel="next"/)[1]);
    } catch (TypeError) {
        // TypeError thrown when I try to access null as an array, which happens when the regular expression doesn't match
        return list
    }
};
async function getURL(package, path) {
    pathURL = package.replace(/\./g, '/') + '/' + path.join('/'); // Path from source root
    url = ['https://api.github.com/repos', organization, package, 'contents/src', pathURL].join('/'); // API URL
    // Is it a module/file?
    response = await fetch(url + extension);
    if (response.ok) {
        return (await response.json()).html_url
    } else {
        // Is it a subpackage/directory?
        response = await fetch(url);
        if (response.ok) {
            // GitHub API doesn't have URLs for directories, only their contents, but the URL structure is predictable so
            return ['https://github.com/', organization, package, 'tree/master/src', pathURL].join('/');
        } else {
            // Get rid of the last element and hey did somebody say r e c u r s i o n ?
            path.pop();
            return getURL(package, path);
        }
    }
};
var target = prompt('Where do you want to go today?');
// Find the package that prefixes the target
package = (await repositoryList([], 'https://api.github.com/orgs/' + organization + '/repos?per_page=100')).find(repository => target.startsWith(repository));
// Using an array instead of a string makes it easier to pop off the last element when recursing getURL()
path = target.slice(package.length + 1).split('.');
if (!path[0]) {
    // Just open the source directory since there's no path
    open('https://github.com/' + organization + '/' + package + '/tree/master/src/' + package.replace(/\./g, '/'));
} else {
    // ok nvm it's not easy
    open(await getURL(package, path));
}
