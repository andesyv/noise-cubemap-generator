# Noise Cubemap Generator
![Build](https://github.com/andesyv/noise-cubemap-generator/workflows/GitHub%20Pages%20Deploy%20CI/badge.svg)
[![GitHub license](https://img.shields.io/github/license/andesyv/noise-cubemap-generator)](https://github.com/andesyv/noise-cubemap-generator/blob/master/LICENSE)

[andesyv.github.io/noise-cubemap-generator/](https://andesyv.github.io/noise-cubemap-generator/)

A small tool for generating noise cubemaps using perlin noise. Uses simplex noise by [Stefan Gustavson](https://github.com/stegu/webgl-noise).

## Testing environment
If you want to test out the result yourself or setup a coding environment, do the following:

### Building
`Node.js` and `yarn` is required to build the project.
The project was made using node version 12 but other versions probably work aswell. 
A `package.json` exist with all the details regarding packages and stuff.

If you don't have `yarn` installed, do
```
npm intall -g yarn
```

With `yarn` installed you can then install all project packages with
```
yarn install
```


The `package.json` file includes a script for building the page which can be run with
```
yarn build
```
The script will run `webpack`, which again will run the typescript compiler and package
everything into the `build` folder. The final result can be viewed in the `build/index.html` file.

## Licensing
See [webgl-noise-LICENCE](https://github.com/andesyv/noise-cubemap-generator/blob/master/webgl-noise-LICENCE) for 3d simplex noise license. The rest of the project is licensed with a normal MIT license seen in [LICENCE](https://github.com/andesyv/noise-cubemap-generator/blob/master/LICENCE).