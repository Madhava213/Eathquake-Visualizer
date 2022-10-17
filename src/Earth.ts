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
        for (let v = 0; v < meshResolution/2; v++) {
            const x = v * xIncrement; 
            const xTexture = v * textureIncrement; 
            for (let w = 0; w < meshResolution/2; w++) {
                const y = w * yIncrement; 
                const yTexture = w * textureIncrement; 

                // Vertices
                // 1st Quadrant
                mapVertices.push(x, y, 0);
                mapVertices.push(x + xIncrement, y, 0);
                mapVertices.push(x + xIncrement, y + yIncrement, 0);
                mapVertices.push(x, y + yIncrement, 0);
                // 2nd Quadrant
                mapVertices.push(-x, y, 0);
                mapVertices.push(-x + xIncrement, y, 0);
                mapVertices.push(-x + xIncrement, y + yIncrement, 0);
                mapVertices.push(-x, y + yIncrement, 0);
                // 3rd Quadrant
                mapVertices.push(-x, -y, 0);
                mapVertices.push(-x + xIncrement, -y, 0);
                mapVertices.push(-x + xIncrement, -y + yIncrement, 0);
                mapVertices.push(-x, -y + yIncrement, 0);
                // 4th Quadrant
                mapVertices.push(x, -y, 0);
                mapVertices.push(x + xIncrement, -y, 0);
                mapVertices.push(x + xIncrement, -y + yIncrement, 0);
                mapVertices.push(x, -y + yIncrement, 0);

                // Texture Coordinates
                // 1st Quadrant
                uvs.push(0.5 + xTexture, 0.5 - yTexture);
                uvs.push(0.5 + xTexture + textureIncrement, 0.5 - yTexture);
                uvs.push(0.5 + xTexture + textureIncrement, 0.5 - yTexture - textureIncrement);
                uvs.push(0.5 + xTexture, 0.5 - yTexture - textureIncrement);
                // 2nd Quadrant
                uvs.push(0.5 - xTexture - textureIncrement, 0.5 - yTexture);
                uvs.push(0.5 - xTexture, 0.5 - yTexture);
                uvs.push(0.5 - xTexture, 0.5 - yTexture - textureIncrement);
                uvs.push(0.5 - xTexture - textureIncrement, 0.5 - yTexture - textureIncrement);
                // 3rd Quadrant
                uvs.push(0.5 - xTexture - textureIncrement, 0.5 + yTexture + textureIncrement);
                uvs.push(0.5 - xTexture, 0.5 + yTexture + textureIncrement);
                uvs.push(0.5 - xTexture, 0.5 + yTexture);
                uvs.push(0.5 - xTexture - textureIncrement, 0.5 + yTexture);
                // 4th Quadrant
                uvs.push(0.5 + xTexture, 0.5 + yTexture + textureIncrement);
                uvs.push(0.5 + xTexture + textureIncrement, 0.5 + yTexture + textureIncrement);
                uvs.push(0.5 + xTexture + textureIncrement, 0.5 + yTexture);
                uvs.push(0.5 + xTexture, 0.5 + yTexture);

            }
        }


        // The normals are always directly outward towards the camera
        mapVertices.forEach(_ => {
            mapNormals.push(0, 0, 1);
        });

        // Next we define indices into the array for the two triangles
        for(let i=0; i <  meshResolution * meshResolution ; i++)
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
    }

    // TO DO: add animations for mesh morphing
    public update(deltaTime: number) : void
    {
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
        const earthquake = new EarthquakeMarker(mapPosition, globePosition, record, duration);

        // Initially, the color is set to yellow.
        // You should update this to be more a meaningful representation of the data.
        earthquake.material.setColor(new gfx.Color(record.normalizedMagnitude, 0.6-record.normalizedMagnitude, 0.6-record.normalizedMagnitude));
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
                    quake.scale.set(0.5, 0.5, 0.5);
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
        const latRange = (90 - (-90));
        const lonRange = (180 - (-180));
        const mapLatRange = (Math.PI - (-Math.PI));
        const mapLonRange = (Math.PI/2 - (-Math.PI/2));
        const x = (((latitude - (-90)) * mapLatRange) / latRange) + (-Math.PI);
        const y = (((longitude - (-180)) * mapLonRange) / lonRange) + (-Math.PI / 2);
        return new gfx.Vector3(x,y,0);
    }

    // This function toggles the wireframe debug mode on and off
    public toggleDebugMode(debugMode : boolean)
    {
        this.earthMaterial.wireframe = debugMode;
    }
}