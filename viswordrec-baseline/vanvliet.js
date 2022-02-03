var sectionHeadings = Array();
var navLinks = {};
var currentH1 = null;
var currentH2 = null;

function updateNav() {
    // Don't do any work if there are no H1 or H2 tags present in the document.
    if(sectionHeadings.length == 0) return;

    // Find the lowest heading that is currently visible
    var currentHeading = sectionHeadings[0];
    for(const heading of sectionHeadings) {
        if(heading.offsetTop <= window.scrollY + window.innerHeight / 2) {
            currentHeading = heading;
        } else {
            break;
        }
    }

    // Bail out early if nothing has changed
    if(currentH1 == currentHeading.id || currentH2 == currentHeading.id) return;

    // Update the appropriate classname in the nav menu
    if(currentH1) navLinks[currentH1].className = '';
    if(currentH2) navLinks[currentH2].className = '';
    // Assume that the heading is an H1 for now
    var navLink = navLinks[currentHeading.id];
    navLink.className = 'in-view';
    currentH1 = currentHeading.id;
    currentH2 = null;
    // Check if it was actually an H2
    if(navLink.parentNode.parentNode.tagName == 'UL') {
        var h1 = navLink.parentNode.parentNode.parentNode.children[0];
        if(h1.tagName == 'A') {
            h1.className = 'in-view';
            currentH1 = h1.href.split('#')[1];
            currentH2 = currentHeading.id;
        }
    }
}

window.addEventListener('load', (event) => {
    for(const el of document.getElementsByTagName('H1')) {
        if(el.id != '') {
            sectionHeadings.push(el);
        }
    }
    for(const el of document.getElementsByTagName('H2')) {
        if(el.id != '') {
            sectionHeadings.push(el);
        }
    }
    sectionHeadings.sort((a, b) => a.offsetTop - b.offsetTop);

    for(const el of document.getElementById('TOC').getElementsByTagName('A')) {
        navLinks[el.href.split('#')[1]] = el;
    }
    updateNav();
});

window.addEventListener('scroll', updateNav);
