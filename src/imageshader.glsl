#include <common>

uniform vec3 iResolution;
uniform float iTime;
uniform int side;
 
void main() {
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = 2.0 * gl_FragCoord.xy/iResolution.xy - 1.0;

    // Time varying pixel color
    vec3 col = 0.5 + 0.5*cos(iTime +float(side + 1)+uv.xyx+vec3(0,2,4));

    vec3 xyz = vec3(1., uv.y, uv.x);
    switch (side) {
        case 0:
        default:
            break;
        case 1:
            xyz = vec3(-1., uv.y, -uv.x);
            break;
        case 2:
            xyz = vec3(uv.x, 1., uv.y);
            break;
        case 3:
            xyz = vec3(uv.x, -1., -uv.y);
            break;
        case 4:
            xyz = vec3(uv.x, uv.y, -1.);
            break;
        case 5:
            xyz = vec3(-uv.x, uv.y, 1.);
            break;
    }

    // Output to screen
    gl_FragColor = vec4(xyz * 0.5 + 0.5,1.0);
}