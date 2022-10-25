/* Assignment 3: Earthquake Visualization
 * CSCI 4611, Fall 2022, University of Minnesota
 * Instructor: Evan Suma Rosenberg <suma@umn.edu>
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import * as gfx from 'gophergfx'
import { EarthquakeMarker } from './EarthquakeMarker';
import { EarthquakeRecord } from './EarthquakeRecord';

export class Earth extends gfx.Transform3
{
    private earthMesh: gfx.Mesh;
    private earthMaterial: gfx.MorphMaterial;

    public globeMode: boolean;
    public naturalRotation: gfx.Quaternion;
    public mouseRotation: gfx.Quaternion;

    constructor()
    {
        // Call the superclass constructor
        super();

        this.earthMesh = new gfx.Mesh();
        this.earthMaterial = new gfx.MorphMaterial();

        this.globeMode = false;
        this.naturalRotation = new gfx.Quaternion();
        this.mouseRotation = new gfx.Quaternion();
    }

    public createMesh() : void
    {
        // Initialize texture: you can change to a lower-res texture here if needed
        // Note that this won't display properly until you assign texture coordinates to the mesh
        this.earthMaterial.texture = new gfx.Texture('./assets/earth-2k.png');
        
        // This disables mipmapping, which makes the texture appear sharper
        this.earthMaterial.texture.setMinFilter(true, false);

        // 20x20 is reasonable for a good looking sphere
        // 150x150 is better for height mapping
        // const meshResolution = 20;
        const meshResolution = 120;

        // A rotation about the Z axis is the earth's axial tilt
        this.naturalRotation.setRotationZ(-23.4 * (Math.PI / 180)); 
        
        // Precalculated vertices, normals, and triangle indices.
        // After we compute them, we can store them directly in the earthMesh,
        // so they don't need to be member variables.
        const mapVertices: number[] = [];
        const mapNormals: number[] = [];
        const indices: number[] = [];
        const uvs: number[] = [];
        
        // As a demo, we'll add a square with 2 triangles.
        // First, we define four vertices
        const xIncrement = (Math.PI * 2) / meshResolution;
        const yIncrement = Math.PI / meshResolution;
        const textureIncrement = 1 / meshResolution;

        for (let v = 0; v <= meshResolution; v++) {
            const x = v * xIncrement;
            const xTexture = v * textureIncrement;
            for (let w = 0; w <= meshResolution; w++) {
                const y = w * yIncrement;
                const yTexture = w * textureIncrement; 

                const resclaeX = gfx.MathUtils.rescale(x, 0, 2 * Math.PI, -Math.PI, Math.PI);
                const resclaeY = gfx.MathUtils.rescale(y, 0, Math.PI, -Math.PI / 2, Math.PI / 2);
                
                mapVertices.push(resclaeX, resclaeY, 0);

                uvs.push(xTexture,1 - yTexture);
            }
        }
        
        // The normals are always directly outward towards the camera
        mapVertices.forEach(_ => {
            mapNormals.push(0, 0, 1);
        });

        // Next we define indices into the array for the two triangles

        for (let v = 0; v < meshResolution ; v++) {
            for (let w = 0; w < meshResolution ; w++) {
                indices.push(v * (meshResolution+1) + w , (v+1) * (meshResolution+1) + w, (v+1) * (meshResolution+1) + w + 1);
                indices.push(v * (meshResolution+1) + w , (v+1) * (meshResolution+1) + w + 1, v * (meshResolution+1) + w + 1);
            }
        }

        // Set all the earth mesh data
        this.earthMesh.setVertices(mapVertices, true);
        this.earthMesh.setNormals(mapNormals, true);
        this.earthMesh.setIndices(indices);
        this.earthMesh.setTextureCoordinates(uvs);
        this.earthMesh.createDefaultVertexColors();
        this.earthMesh.material = this.earthMaterial;

        // Add the mesh to this group
        this.add(this.earthMesh);

        // Compute the morph vertices and normals
        this.computeMorphTarget(this.earthMesh);

    }

    // TO DO: add animations for mesh morphing
    public update(deltaTime: number) : void
    {
        if (this.globeMode == true) {
            if (this.earthMaterial.morphAlpha < 1) {
                this.earthMaterial.morphAlpha = gfx.MathUtils.lerp(0, 1, this.earthMaterial.morphAlpha+0.01);
            }
        }
        else {
            if (this.earthMaterial.morphAlpha > 0 ) {
                this.earthMaterial.morphAlpha = gfx.MathUtils.lerp(1, 0, (1-this.earthMaterial.morphAlpha)+0.01);
            }
        }
        // TO DO

        

    }

    public createEarthquake(record: EarthquakeRecord, normalizedMagnitude : number)
    {
        // Number of milliseconds in 1 year (approx.)
        const duration = 12 * 28 * 24 * 60 * 60;
        // TO DO: currently, the earthquake is just placed randomly on the plane
        // You will need to update this code to calculate both the map and globe positions
        // new gfx.Vector3(Math.random()*6-3, Math.random()*4-2, 0)
        const mapPosition = this.convertLatLongToPlane(record.latitude,record.longitude);
        const globePosition = this.convertLatLongToSphere(record.latitude,record.longitude);
        const earthquake = new EarthquakeMarker(mapPosition, globePosition, record, duration, this.earthMaterial.morphAlpha);

        // Initially, the color is set to yellow.
        // You should update this to be more a meaningful representation of the data.
        earthquake.material.setColor(new gfx.Color(1, normalizedMagnitude, 0));
        this.add(earthquake);
    }

    public animateEarthquakes(currentTime : number)
    {
        // This code removes earthquake markers after their life has expired
        this.children.forEach((quake: gfx.Transform3) => {
            if(quake instanceof EarthquakeMarker)
            {
                // Animate
                const playbackLife = (quake as EarthquakeMarker).getPlaybackLife(currentTime);
                if(playbackLife >= 1)
                {
                    quake.remove();
                }
                else
                {
                    // Global adjustment to reduce the size. You should probably update this be a
                    // more meaningful representation of the earthquake's lifespan.
                    const c = gfx.MathUtils.clamp(quake.scale.x, 0, 0.5);
                    quake.scale.set(c, c, c);
                    quake.scale.lerp(quake.scale,new gfx.Vector3(0,0,0),playbackLife);
                }
                
                // Morph
                if (this.globeMode == true) {
                    const posStatus = gfx.MathUtils.rescale(quake.position.x, quake.mapPosition.x, quake.globePosition.x, 0, 1);
                    if (posStatus < 1) {
                        quake.position.lerp(quake.mapPosition, quake.globePosition, posStatus+0.01);
                    }
                }
                else {
                    const posStatus = gfx.MathUtils.rescale(quake.position.x, quake.globePosition.x, quake.mapPosition.x, 0, 1);
                    if (posStatus < 1) {
                        quake.position.lerp(quake.globePosition, quake.mapPosition, posStatus);
                    }
                }
            }
        });

    }

    public convertLatLongToSphere(latitude: number, longitude: number) : gfx.Vector3
    {
        // TO DO: We recommend filling in this function to put all your
        // lat,long --> plane calculations in one place.
        const x = Math.cos((Math.PI / 180) * latitude) * Math.sin((Math.PI / 180) * longitude)
        const y= Math.sin((Math.PI / 180) * latitude)
        const z = Math.cos((Math.PI / 180) * latitude) * Math.cos((Math.PI / 180) * longitude)
        return new gfx.Vector3(x,y,z);
    }

    public convertLatLongToPlane(latitude: number, longitude: number) : gfx.Vector3
    {
        // TO DO: We recommend filling in this function to put all your
        // lat,long --> plane calculations in one place.

        const x = gfx.MathUtils.rescale(longitude, -180, 180, -Math.PI, Math.PI);
        const y = gfx.MathUtils.rescale(latitude,-90,90,-Math.PI/2,Math.PI/2);
        return new gfx.Vector3(x,y,0);
    }

    // This function toggles the wireframe debug mode on and off
    public toggleDebugMode(debugMode : boolean)
    {
        this.earthMaterial.wireframe = debugMode;
    }

    private computeMorphTarget(mesh: gfx.Mesh): void {
        const vArray = mesh.getVertices();
        const nArray = mesh.getNormals();
        const indices = mesh.getIndices();

        const vertices: gfx.Vector3[] = [];
        const normals: gfx.Vector3[] = [];

        // Copy the vertices and normals into Vector3 arrays for convenience
        for (let i = 0; i < vArray.length; i += 3) {
            vertices.push(new gfx.Vector3(vArray[i], vArray[i + 1], vArray[i + 2]));
            normals.push(new gfx.Vector3(nArray[i], nArray[i + 1], nArray[i + 2]));
        }

        const morphVertices: gfx.Vector3[] = [];
        const morphNormals: gfx.Vector3[] = [];

        for (let i = 0; i < vertices.length; i++) {
            morphVertices.push(new gfx.Vector3(0, 0, 0));
            morphNormals.push(new gfx.Vector3(0, 0, 1));
        }

        for (let i = 0; i < indices.length; i += 3) {
            // Get all three vertices in the triangle
            const v1 = vertices[indices[i]].clone();
            const v2 = vertices[indices[i+1]].clone();
            const v3 = vertices[indices[i + 2]].clone();

            // Create a new triangle
            const mv1X = gfx.MathUtils.rescale(v1.x,-Math.PI,Math.PI, -180,180);
            const mv1Y = gfx.MathUtils.rescale(v1.y,-Math.PI / 2, Math.PI / 2,-90, 90);
            const mv1 = this.convertLatLongToSphere(mv1Y,mv1X);
            
            const mv2X = gfx.MathUtils.rescale(v2.x,-Math.PI,Math.PI, -180,180);
            const mv2Y = gfx.MathUtils.rescale(v2.y,-Math.PI / 2, Math.PI / 2,-90, 90);
            const mv2 = this.convertLatLongToSphere(mv2Y,mv2X);

            const mv3X = gfx.MathUtils.rescale(v3.x,-Math.PI,Math.PI, -180,180);
            const mv3Y = gfx.MathUtils.rescale(v3.y,-Math.PI / 2, Math.PI / 2,-90, 90);
            const mv3 = this.convertLatLongToSphere(mv3Y,mv3X);

            // Assign Normals
            const mn1 = gfx.Vector3.subtract(mv1, new gfx.Vector3(0, 0, 0));
            const mn2 = gfx.Vector3.subtract(mv2, new gfx.Vector3(0, 0, 0));
            const mn3 = gfx.Vector3.subtract(mv3, new gfx.Vector3(0, 0, 0));

            morphVertices[indices[i]] = mv1;
            morphVertices[indices[i+1]] = mv2;
            morphVertices[indices[i + 2]] = mv3;
            
            morphNormals[indices[i]] = mn1;
            morphNormals[indices[i+1]] = mn2;
            morphNormals[indices[i+2]] = mn3;
        }
        
        mesh.setMorphTargetVertices(morphVertices);
        mesh.setMorphTargetNormals(morphNormals);
    }
}