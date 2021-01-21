#include <common>

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

#define M_PI 3.14159

mat4 persp(float FOV, float aspectRatio, float n, float f) {
    float t = tan(FOV * M_PI / 360.0) * n;
    float r = aspectRatio * t;

    return mat4(
        vec4(n / r, 0., 0., 0.),
        vec4(0., n / t, 0., 0.),
        vec4(0., 0., -(f + n) / (f - n), -1.),
        vec4(0., 0., -2. * f * n / (f - n), 0.)
    );
}

// https://iquilezles.org/www/articles/boxfunctions/boxfunctions.htm
vec2 rayBox( in vec3 ro, in vec3 rd, in vec3 bsize, in vec3 bpos, out vec3 oN ) 
{
    // Shift ray origin with box position
    ro -= bpos;
    vec3 m = 1.0/rd;
    vec3 n = m*ro;
    vec3 k = abs(m)*bsize;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;

    float tN = max( max( t1.x, t1.y ), t1.z );
    float tF = min( min( t2.x, t2.y ), t2.z );
	
    if( tN>tF || tF<0.0) return vec2(-1.0); // no intersection
    
    oN = -sign(rd)*step(t1.yzx,t1.xyz)*step(t1.zxy,t1.xyz);

    return vec2( tN, tF );
}

vec4 makeQuat(vec3 dir, float angle) {
    return vec4(sin(angle / 2.0) * dir, cos(angle/2.0));
}

vec4 mulQuat(vec4 q1, vec4 q2) {
    return vec4(
        q1.w * q2.xyz + q2.w * q1.xyz + cross(q1.xyz, q2.xyz),
        q1.w * q2.w - dot(q1.xyz, q2.xyz)
    );
}

mat4 matFromQuat(vec4 q) {
    return mat4(
        vec4(
            1. - 2. * q.y * q.y - 2. * q.z * q.z,
            2. * q.x * q.y - 2. * q.z * q.w,
            2. * q.x * q.z + 2. * q.y * q.w,
            0.),
        vec4(
            2. * q.x * q.y + 2. * q.z * q.w,
            1. - 2. * q.x * q.x - 2. * q.z * q.z,
            2. * q.y * q.z - 2. * q.x * q.w,
            0.
        ),
        vec4(
            2. * q.x * q.z - 2. * q.y * q.w,
            2. * q.y * q.z + 2. * q.x * q.w,
            1. - 2. * q.x * q.x - 2. * q.y * q.y,
            0.
        ),
        vec4(0., 0., 0., 1.)
    );
}

// https://gamedev.stackexchange.com/questions/28395/rotating-vector3-by-a-quaternion
vec3 rotateByQuat(vec3 v, vec4 q) {
	vec3 u = q.xyz;
	float s = q.w;
	return 2.0 * dot(u, v) * u
			+ (s * s - dot(u, u)) * v
			+ 2.0 * s * cross(u, v);
}

vec3 rotate(vec3 v, vec3 dir, float angle) {
    return rotateByQuat(v, makeQuat(dir, angle));
}

void mainImage(out vec4 fragColor, in vec2 texCoords) {
    vec2 uv = 2. * texCoords / iResolution.xy - 1.;
    vec2 mPos = 2. * iMouse.xy / iResolution.xy - 1.;

    mat4 view = matFromQuat(
        mulQuat(makeQuat(vec3(1., 0., 0.), mPos.y * M_PI),
        makeQuat(vec3(0., 1., 0.), -mPos.x * M_PI))
    );
    mat4 proj = persp(60., iResolution.x / iResolution.y, 0.1, 100.0);
    mat4 mat = inverse(proj * view);
    
    // Near and far plane
    vec4 near = mat * vec4(uv, -1., 1.0);
    near /= near.w;
    vec4 far = mat * vec4(uv, 1., 1.0);
    far /= far.w;

    /// Scene geometry
    // Box pos
    vec4 bpos = mat * vec4(0., 0., 0., 1.0);
    bpos /= bpos.w;

    // Light pos
    vec4 lpos = mat * vec4(0., 0., -1., 1.);
    lpos /= lpos.w;

    vec3 ro = near.xyz;
    vec3 rd = normalize((far - near).xyz);

    vec3 normal;
    vec2 bounds = rayBox(ro, rd, vec3(0.03), bpos.xyz, normal);
    if (0.0 < bounds.y) {
        // Surface position (if bounds.x is negative, we are behind camera. Start at camera pos instead)
        vec3 sp = ro + rd * max(bounds.x, 0.);
        vec3 ld = normalize(sp - lpos.xyz);
        vec3 phong = max(dot(-ld, normal), 0.15) * texture(iChannel0, uv).xyz;
        fragColor = vec4(phong, 1.);
        return;
    }

    fragColor = vec4(rd.xyz * 0.5 + 0.5, 1.);
}
 
void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}