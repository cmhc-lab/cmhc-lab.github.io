function logoSwitch(image) {
    image.onload = null;
    const logoIndex = 1 + Math.floor(3 * Math.random());
    image.src = image.src.substr(0, image.src.length - 5) + logoIndex + '.svg';
}
