/* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["data"] }] */
import * as BAS from 'three-bas';
import * as THREE from 'three';
import { Power1, TweenMax } from 'gsap';
import Chuncks from './chunks';

class ParticleSystem {
    constructor(mainBrain, brainParticles, memories) {
        this.chuncks = new Chuncks();
        this.brainParticles = brainParticles;
        this.memories = memories;

        this.particlesStartColor = new THREE.Color(0xffffff);
        this.particlesColor = new THREE.Color(0xffffff);
        this.particles = this.init();
        this.mainBrain = mainBrain;
    }

    static getLoadingPoints() {
        const geometry = new THREE.RingBufferGeometry(100, 40, 150, 150, 20);
        return geometry.attributes.position.array;
    }

    init() {
        const duration = 1.0;
        const maxPointDelay = 0.3;

        const brainPoints = this.brainParticles.attributes.position.array;

        const count = brainPoints.length / 3;
        const me = this;

        const geometry = new BAS.PointBufferGeometry(count);

        const loadingCircle = ParticleSystem.getLoadingPoints();
        geometry.createAttribute('aStartLoading', 3, (data, index, num) => {
            const startVec3 = new THREE.Vector3();
            if (loadingCircle.length < brainPoints.length) {
                startVec3.x = loadingCircle[(index * 3) + 0] || 0.0;
                startVec3.y = loadingCircle[(index * 3) + 1] || 0.0;
                startVec3.z = THREE.Math.randFloat(-80.0, 1500.0); // loadingCircle[index * 3 + 2] || 0
            } else {
                startVec3.x = 100.0;
                startVec3.y = 100.0;
                startVec3.z = THREE.Math.randFloat(-80.0, 1500.0); // loadingCircle[index * 3 + 2] || 0
            }
            startVec3.toArray(data);
        });

        const color = new THREE.Color();
        geometry.createAttribute('aStartColor', 3, (data) => {
            const { r, g, b } = me.particlesStartColor;

            color.setRGB(r, g, b);
            color.toArray(data);
        });

        geometry.createAttribute('scale', 1, (data) => {
            data[0] = THREE.Math.randFloat(200.0, 400.0);
        });

        geometry.createAttribute('aEndColor', 3, (data) => {
            const { r, g, b } = me.particlesStartColor;

            color.setRGB(r, g, b);
            color.toArray(data);
        });

        geometry.createAttribute('aEndPos', 3, (data, index) => {
            const startVec3 = new THREE.Vector3();
            startVec3.x = brainPoints[(index * 3) + 0];
            startVec3.y = brainPoints[(index * 3) + 1];
            startVec3.z = brainPoints[(index * 3) + 2];
            startVec3.toArray(data);
        });

        this.totalDuration = duration + maxPointDelay;

        geometry.createAttribute('aDelayDuration', 3, (data) => {
            data[0] = Math.random() * maxPointDelay;
            data[1] = duration;
        });

        const material = new BAS.PointsAnimationMaterial({
            // transparent: true,
            // blending: THREE.AdditiveBlending,
            vertexColors: THREE.VertexColors,
            deptWrite: false,

            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            uniforms: {
                uTime: { type: 'f', value: 0 },
                uProgress: { type: 'float', value: 0.0 },
                uAngle: { type: 'f', value: 1.0 },
                uPointSizeEffect: { type: 'f', value: 0.1 },
                uColor: { value: new THREE.Color(0xffffff) },
            },
            defines: {
                USE_SIZEATTENUATION: false, //Change size of the particle depending of the camera
            },
            uniformValues: {
                size: 1.8,
                scale: 400,
            },
            vertexFunctions: [
                BAS.ShaderChunk.ease_expo_in_out,
                BAS.ShaderChunk.quaternion_rotation,
                this.chuncks.rotate,
                this.chuncks.random,
                this.chuncks.noise,
            ],

            vertexParameters: [
                'uniform float uTime;',
                'uniform float uPointSizeEffect;',
                'uniform float uProgress;',
                'uniform float uAngle;',
                'attribute vec2 aDelayDuration;',
                'attribute vec3 aStartLoading;',
                'attribute vec3 aStartPos;',
                'attribute vec3 aEndPos;',
                'attribute vec3 aStartColor;',
                'attribute vec3 aEndColor;',
                'attribute float aStartOpacity;',
                'attribute float aEndOpacity;',

            ],
            varyingParameters: [
                `
          varying vec3 vParticle;
          varying vec3 vEndPos;
          varying vec3 vStartLoading;
          `,
            ],
            // this chunk is injected 1st thing in the vertex shader main() function
            // variables declared here are available in all subsequent chunks
            vertexInit: [
                // calculate a progress value between 0.0 and 1.0 based on the vertex delay and duration, and the uniform time
                'float tProgress = clamp(uProgress - aDelayDuration.x, 0.0, aDelayDuration.y) / aDelayDuration.y;',
                // // ease the progress using one of the available easing functions
                'tProgress = easeExpoInOut(tProgress);',
                // 'tProgress = uProgress;'
                // 'if(test){ tProgress = 0.0; } else { tProgress = 1.0 ;}'
            ],
            // this chunk is injected before all default position calculations (including the model matrix multiplication)
            vertexPosition: [`
        // linearly interpolate between the start and end position based on tProgress
        // and add the value as a delta
 
         if(tProgress < 0.5){ 
         vec2 pos = vec2(aStartLoading.xy*5.0);

        // Use the noise function
        float n = noise(aStartLoading.yx);
     vec2 test;
      if(mod(aStartLoading.x, 2.0) < 0.2){
            test = rotate2D(aStartLoading.xy, PI*2.0 * uTime * uAngle * n);
             transformed += vec3(test.x, test.y, aStartLoading.z * n);
        }else if (mod(aStartLoading.x, 2.0) >= 0.2 && mod(aStartLoading.x, 2.0) < 1.5){
            test = rotate2D(aStartLoading.xy + n, PI*2.0 * uTime * 0.05 * uAngle * n);
            transformed += vec3(test.x, test.y, aStartLoading.z * n);
        }else {
            test = rotate2D(aStartLoading.xy + n, PI*2.0 * uTime * 0.01 * uAngle * n);
            transformed += vec3(test.x, test.y , aStartLoading.z * n);
        }
        }else{
        
  
        //Brain Particles
           transformed += mix(aStartLoading, aEndPos, tProgress);
        }   
        `,
            ],
            // this chunk is injected before all default color calculations
            vertexColor: [
                // linearly interpolate between the start and end position based on tProgress
                // and add the value as a delta
                `
         vColor = mix(aStartColor, aEndColor, tProgress);
         vParticle = aEndPos;
         
        vEndPos = aEndPos;
        vStartLoading = aStartLoading;
        `,
            ],

            fragmentParameters: [

                'uniform float uTime;',
                'uniform vec3 uColor;',
            ],
            // convert the point (default is square) to circle shape, make sure transparent of material is true
            // you can create more shapes: https://thebookofshaders.com/07/
            fragmentShape: [
                `
        float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
        float pct = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
        vec3 color = vec3(1.0) * gl_FragColor.rgb;
        gl_FragColor = vec4(color, pct * gl_FragColor.a);
        if(vStartLoading.x == 0.0 && vStartLoading.y == 0.0){
         // gl_FragColor.a = 0.0;
        }
       `],

            fragmentDiffuse: [
                // gl_FrontFacing is a built-in glsl variable that indicates if the current fragment is front-facing
                // if its not front facing, set diffuse color to uBackColor
                `
        //diffuseColor.rgb = vBackColor.xyz;
        
       // diffuseColor.rgb = vec3(0.0, 0.0, 1.0);
       
       // if( vEndPos.x > 50.0 && vEndPos.y > 50.0 ){
       //   diffuseColor.rgb = vec3(0.0, 0.0, 1.0);
       //    diffuseColor.a = smoothstep(0.0, 1.0, sin(vEndPos.x*10.0 + uTime)*60.0 );
       // }
        `,
            ],
        });

        const system = new THREE.Points(geometry, material);
        system.castShadow = true;
        //
        // // depth material is used for directional & spot light shadows
        system.customDepthMaterial = BAS.Utils.createDepthAnimationMaterial(material);
        // // distance material is used for point light shadows
        system.customDistanceMaterial = BAS.Utils.createDistanceAnimationMaterial(material);

        return system;
    }

    update(deltaTime) {
        this.particles.customDepthMaterial.uniforms.uTime.value = Math.sin(deltaTime);
        this.particles.customDistanceMaterial.uniforms.uTime.value = Math.sin(deltaTime);
        this.particles.material.uniforms.uTime.value = deltaTime;
    }

    updateTransitioning(val) {
        this.particles.material.uniforms.uProgress.value += 1 / 300;
        this.particles.customDepthMaterial.uniforms.uProgress.value += 1 / 300;
        this.particles.customDistanceMaterial.uniforms.uProgress.value += 1 / 300;
    }

    transform(status) {
        if (status) {
            const progress = { p: 0.0 };
            TweenMax.fromTo(progress, 5.9, { p: 0.0 }, {
                p: 1.5,
                ease: Power1.easeIn,
                onUpdate: () => {
                    this.updateTransitioning(progress.p);
                },
                onComplete: () => {
                    this.mainBrain.orbitControls.maxDistance = 700;
                    this.mainBrain.orbitControls.autoRotate = true;
                },
            });
        } else {
            const progress = { p: 1.0 };
            TweenMax.fromTo(progress, 2.0, { p: 1.0 }, {
                p: 0.5,
                ease: Power1.easeIn,
                onUpdate: () => {
                    this.updateTransitioning(progress.p);
                },
            });
        }
    }
}

export default ParticleSystem;
