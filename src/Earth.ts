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

        this.globeMode = true;
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
        const meshResolution = 20;
        // const meshResolution = 120;

        // A rotation about the Z axis is the earth's axial tilt
        this.naturalRotation.setRotationZ(-23.4 * Math.PI / 180); 
        
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

        for (let v = 0; v < meshResolution; v++) {
            const x = v * xIncrement;
            const xTexture = v * textureIncrement;
            for (let w = 0; w < meshResolution; w++) {
                const y = w * yIncrement;
                const yTexture = w * textureIncrement; 

                const resclaeX = gfx.MathUtils.rescale(x, 0, 2 * Math.PI, -Math.PI, Math.PI);
                const resclaeY = gfx.MathUtils.rescale(y, 0, Math.PI, -Math.PI / 2, Math.PI / 2);
                
                mapVertices.push(resclaeX, resclaeY, 0);
                mapVertices.push(resclaeX + xIncrement, resclaeY, 0);
                mapVertices.push(resclaeX + xIncrement, resclaeY + yIncrement, 0);
                mapVertices.push(resclaeX, resclaeY + yIncrement, 0);

                uvs.push(xTexture,1 - yTexture);
                uvs.push(xTexture + textureIncrement,1 - yTexture);
                uvs.push(xTexture + textureIncrement,1 - yTexture - textureIncrement);
                uvs.push(xTexture,1 - yTexture - textureIncrement);
            }
        }

        // The normals are always directly outward towards the camera
        mapVertices.forEach(_ => {
            mapNormals.push(0, 0, 1);
        });

        // Next we define indices into the array for the two triangles
        for(let i=0; i <  (meshResolution * meshResolution) ; i++)
        {
            indices.push( (i*4) + 0, (i*4) + 1, (i*4) + 2);
            indices.push( (i*4) + 0,  (i*4) + 2,  (i*4) + 3);
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
            this.earthMaterial.morphAlpha = 1;
        }
        else {
            this.earthMaterial.morphAlpha = 0;
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
        const earthquake = new EarthquakeMarker(mapPosition, globePosition, record, duration, this.globeMode);

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
            }
        });
    }

    public convertLatLongToSphere(latitude: number, longitude: number) : gfx.Vector3
    {
        // TO DO: We recommend filling in this function to put all your
        // lat,long --> plane calculations in one place.
        const x = Math.cos(Math.PI / 180 * latitude) * Math.sin(Math.PI / 180 * longitude)
        const y= Math.sin(Math.PI / 180 * latitude)
        const z = Math.cos(Math.PI / 180 * latitude) * Math.cos(Math.PI / 180 * longitude)
        return new gfx.Vector3(x,y,z);
    }

    public convertLatLongToPlane(latitude: number, longitude: number) : gfx.Vector3
    {
        // TO DO: We recommend filling in this function to put all your
        // lat,long --> plane calculations in one place.

        const x = gfx.MathUtils.rescale(latitude,-90,90,-Math.PI,Math.PI);
        const y = gfx.MathUtils.rescale(longitude, -180, 180, -Math.PI / 2, Math.PI / 2);
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
            
            // Get all three normals in the triangle
            const n1 = vertices[indices[i]].clone();
            const n2 = vertices[indices[i+1]].clone();
            const n3 = vertices[indices[i+2]].clone();

            // // Create a new triangle
            // const mv1X = Math.cos(v1.x) * Math.sin(v1.y)
            // const mv1Y = Math.sin(v1.x)
            // const mv1Z = Math.cos(v1.x) * Math.cos(v1.y)
            // const mv1 = new gfx.Vector3(mv1X, mv1Y, mv1Z);
            
            // const mv2X = Math.cos(v2.x) * Math.sin(v2.y)
            // const mv2Y = Math.sin(v2.x)
            // const mv2Z = Math.cos(v2.x) * Math.cos(v2.y)
            // const mv2 = new gfx.Vector3(mv2X,mv2Y,mv2Z);

            // const mv3X = Math.cos(v3.x) * Math.sin(v3.y)
            // const mv3Y = Math.sin(v3.x)
            // const mv3Z = Math.cos(v3.x) * Math.cos(v3.y)
            // const mv3 = new gfx.Vector3(mv3X,mv3Y,mv3Z);

            // Create a new triangle
            const mv1X = gfx.MathUtils.rescale(v1.x,-Math.PI,Math.PI, -90,90);
            const mv1Y = gfx.MathUtils.rescale(v1.y,-Math.PI / 2, Math.PI / 2,-180, 180);
            const mv1 = this.convertLatLongToSphere(mv1X, mv1Y);
            
            const mv2X = gfx.MathUtils.rescale(v2.x,-Math.PI,Math.PI, -90,90);
            const mv2Y = gfx.MathUtils.rescale(v2.y,-Math.PI / 2, Math.PI / 2,-180, 180);
            const mv2 = this.convertLatLongToSphere(mv2X,mv2Y);

            const mv3X = gfx.MathUtils.rescale(v3.x,-Math.PI,Math.PI, -90,90);
            const mv3Y = gfx.MathUtils.rescale(v3.y,-Math.PI / 2, Math.PI / 2,-180, 180);
            const mv3 = this.convertLatLongToSphere(mv3X,mv3Y);
            
            // // Assign Normals

            // const mn1 = gfx.Vector3.subtract(mv1, new gfx.Vector3(0, 0, 0));
            // const mn2 = gfx.Vector3.subtract(mv2, new gfx.Vector3(0, 0, 0));
            // const mn3 = gfx.Vector3.subtract(mv3, new gfx.Vector3(0, 0, 0));

            // // Compute another random triangle rotation
            // let rotationQuat;
            // let translationQuat;
            // let position;
                
            // // MV1 //
            // const mv1RotX = gfx.MathUtils.rescale(mv1.y, -Math.PI / 2, Math.PI / 2, 1/4, (1 + 1/4));
            // const mv1RotY = gfx.MathUtils.rescale(mv1.x, -Math.PI, Math.PI, 1/4, (1 + 1/4));
            // const mv1RotZ = gfx.MathUtils.rescale(mv1.x, -Math.PI, Math.PI, 1/4, (1 + 1/4));
            // rotationQuat = gfx.Quaternion.makeEulerAngles(
            //     mv1RotX*Math.PI*2,
            //     mv1RotY*Math.PI*2,
            //     mv1RotZ*Math.PI*2);
            // mv1.rotate(rotationQuat);

            // const mv1X = gfx.MathUtils.rescale(mv1.y, -Math.PI / 2, Math.PI / 2, 1/4, (1 + 1/4));
            // const mv1Y = gfx.MathUtils.rescale(mv1.x, -Math.PI, Math.PI, 0, -1);
            // const mv1Z = gfx.MathUtils.rescale(mv1.x, -Math.PI, Math.PI, 0, 1);
            // // Compute a position within a sphere
            // translationQuat = gfx.Quaternion.makeEulerAngles(
            //     mv1X*Math.PI*2,
            //     mv1Y*Math.PI*2,
            //     Math.random()*Math.PI*2)
            // position = gfx.Vector3.rotate(new gfx.Vector3(0, 0, 1), translationQuat);
            // mv1.add(position);
            

            // // MV2 //
            // const mv2RotX = gfx.MathUtils.rescale(mv2.y, -Math.PI / 2, Math.PI / 2, 1/4, (1 + 1/4));
            // const mv2RotY = gfx.MathUtils.rescale(mv2.x, -Math.PI, Math.PI, 1/4, (1 + 1/4));
            // const mv2RotZ = gfx.MathUtils.rescale(mv2.x, -Math.PI, Math.PI, 1/4, (1 + 1/4));
            // rotationQuat = gfx.Quaternion.makeEulerAngles(
            //     mv2RotX*Math.PI*2,
            //     mv2RotY*Math.PI*2,
            //     mv2RotZ*Math.PI*2);
            // mv2.rotate(rotationQuat);

            // const mv2X = gfx.MathUtils.rescale(mv2.y, -Math.PI / 2, Math.PI / 2, 1/4, (1 + 1/4));
            // const mv2Y = gfx.MathUtils.rescale(mv2.x, -Math.PI, Math.PI, 0, -1);
            // const mv2Z = gfx.MathUtils.rescale(mv2.x, -Math.PI, Math.PI, 0, 1);
            // // Compute a position within a sphere
            // translationQuat = gfx.Quaternion.makeEulerAngles(
            //     mv2X*Math.PI*2,
            //     mv2Y*Math.PI*2,
            //     Math.random()*Math.PI*2)
            // position = gfx.Vector3.rotate(new gfx.Vector3(0, 0, 1), translationQuat);
            // mv2.add(position);

            
            // // MV3 //
            // const mv3RotX = gfx.MathUtils.rescale(mv3.y, -Math.PI / 2, Math.PI / 2, 1/4, (1 + 1/4));
            // const mv3RotY = gfx.MathUtils.rescale(mv3.x, -Math.PI, Math.PI, 1/4, (1 + 1/4));
            // const mv3RotZ = gfx.MathUtils.rescale(mv3.x, -Math.PI, Math.PI, 1/4, (1 + 1/4));
            // rotationQuat = gfx.Quaternion.makeEulerAngles(
            //     mv3RotX*Math.PI*2,
            //     mv3RotY*Math.PI*2,
            //     mv3RotZ*Math.PI*2);
            // mv3.rotate(rotationQuat);

            // const mv3X = gfx.MathUtils.rescale(mv3.y, -Math.PI / 2, Math.PI / 2, 1/4, (1 + 1/4));
            // const mv3Y = gfx.MathUtils.rescale(mv3.x, -Math.PI, Math.PI, 0, -1);
            // const mv3Z = gfx.MathUtils.rescale(mv3.x, -Math.PI, Math.PI, 0, 1);
            // // Compute a position within a sphere
            // translationQuat = gfx.Quaternion.makeEulerAngles(
            //     mv3X*Math.PI*2,
            //     mv3Y*Math.PI*2,
            //     Math.random()*Math.PI*2)
            // position = gfx.Vector3.rotate(new gfx.Vector3(0, 0, 1), translationQuat);
            // mv3.add(position);  

            morphVertices[indices[i]] = mv1;
            morphVertices[indices[i+1]] = mv2;
            morphVertices[indices[i + 2]] = mv3;
            
            // morphNormals[indices[i]] = mn1;
            // morphNormals[indices[i+1]] = mn2;
            // morphNormals[indices[i+2]] = mn3;
        }
        
        mesh.setMorphTargetVertices(morphVertices);
        mesh.setMorphTargetNormals(morphNormals);
    }
}