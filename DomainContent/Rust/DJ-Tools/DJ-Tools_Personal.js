// DJ_Tools_Spawner.js
//
// Created by Milad Nazeri on 2018-06-19
//
// Copyright 2018 High Fidelity, Inc.
//
// Distributed under the Apache License, Version 2.0.
// See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
// Creates a personal one around you, not relying on rust 

(function () {
    // Polyfill
    Script.require("../../../Utilities/Polyfills.js")();

    // Helper Functions
    var Util = Script.require("../../../Utilities/Helper.js?");
    
    var getNameProps = Util.Entity.getNameProps,
        getUserData = Util.Entity.getUserData,
        inFrontOf = Util.Avatar.inFrontOf,
        updateUserData = Util.Entity.updateUserData,
        makeColor = Util.Color.makeColor,
        vec = Util.Maths.vec;
    
    // Log Setup
    var LOG_CONFIG = {},
        LOG_ENTER = Util.Debug.LOG_ENTER,
        LOG_UPDATE = Util.Debug.LOG_UPDATE,
        LOG_ERROR = Util.Debug.LOG_ERROR,
        LOG_VALUE = Util.Debug.LOG_VALUE,
        LOG_ARCHIVE = Util.Debug.LOG_ARCHIVE;

    LOG_CONFIG[LOG_ENTER] = true;
    LOG_CONFIG[LOG_UPDATE] = true;
    LOG_CONFIG[LOG_ERROR] = true;
    LOG_CONFIG[LOG_VALUE] = true;
    LOG_CONFIG[LOG_ARCHIVE] = false;
    var log = Util.Debug.log(LOG_CONFIG);

    // Init
    var DJ_NAME = AccountServices.username,
        DJ_TABLE_NAME = "Set_" + DJ_NAME + "_Tables",
        baseURL = "https://hifi-content.s3.amazonaws.com/milad/ROLC/Organize/O_Projects/Hifi/Scripts/hifi-content/DomainContent/Rust/DJ-Tools/",
        particlePadLeftModel = "https://hifi-content.s3.amazonaws.com/alan/dev/particle-pad-1.fbx",
        particlePadRightModel = "https://hifi-content.s3.amazonaws.com/alan/dev/particle-pad-2.fbx",
        shortSoundURL = baseURL + 'FlameThrowerBurst.wav',
        longSoundURL = baseURL + 'FlameThrowerRun.wav',
        endPointParticleServerScript = baseURL + 'DJ_EndPoint_Particle_Server.js',
        endPointLightServerScript = baseURL + 'DJ_EndPoint_Light_Server.js',
        endPointSoundServerScript = baseURL + 'DJ_EndPoint_Sound_Server.js',   
        dispatchZoneClientScript = baseURL + 'DJ_Dispatch_Zone_Client.js',
        dispatchZoneServerScript = baseURL + 'DJ_Dispatch_Zone_Server.js',
        sensorBoxClientScript = baseURL + 'DJ_Sensor_Box_Client.js',
        generatorDebugCubeScript = baseURL + 'DJ_Generator_Debug_Cube_Client.js',
        dispatchZoneID = null,
        DEBUG = false,
        CREATE_TIMEOUT = 250,
        LEFT = "Left",
        RIGHT = "Right",
        LEFT_HAND = "LeftHand",
        RIGHT_HAND = "RightHand",
        DEBUG_CUBE = "debugCube",
        GROUP_LEFT = "Group_Left", 
        GROUP_RIGHT = "Group_Right",
        GENERATOR = "generator",
        SENSOR = "sensor",
        ENDPOINT = "endPoint";

    // Colections
    var djTableProps = getNameProps(DJ_TABLE_NAME),
        avatarPosition = MyAvatar.position,
        avatarOrientation = MyAvatar.orientation,
        inFrontOfAvatar = inFrontOf(0.5),
        particleBaseProps = {
            type: "ParticleEffect",
            isEmitting: true,
            lifespan: 2.0299999713897705,
            maxParticles: 6717,
            textures: "http://hifi-content.s3.amazonaws.com/alan/dev/Particles/Bokeh-Particle.png",
            emitRate: 0,
            emitSpeed: 1.47,
            emitDimensions: {
                x: 0.5,
                y: 0.5,
                z: 0.5
            },
            emitOrientation: {
                x: -90.01,
                y: 0,
                z: 0
            },
            emitterShouldTrail: true,
            particleRadius: 0,
            radiusSpread: 0,
            radiusStart: 0.5799999833106995,
            radiusFinish: 0,
            color: {
                red: 255,
                blue: 255,
                green: 255
            },
            colorSpread: {
                red: 0,
                blue: 0,
                green: 0
            },
            colorStart: {
                red: 255,
                blue: 33,
                green: 33
            },
            colorFinish: {
                red: 239,
                blue: 255,
                green: 13
            },
            emitAcceleration: {
                x: 0.01,
                y: 0.01,
                z: 0.01
            },
            accelerationSpread: {
                x: 1,
                y: 1,
                z: 1
            },
            alpha: 0.6000000238418579,
            alphaSpread: 0,
            alphaStart: 0.09000000357627869,
            alphaFinish: 0,
            polarStart: 0,
            polarFinish: 1.02974,
            azimuthStart: -180.00000500895632,
            azimuthFinish: 180.00000500895632
        },
        lightBaseProps = {
            type: "Light",
            angularDamping: 0,
            color: {
                red: 255,
                blue: 255,
                green: 255
            },
            intensity: 0,
            falloffRadius: 0,
            isSpotlight: 0,
            exponent: 0,
            cutoff: 10,
            collisionless: true
        },
        barrelStageLeftPosition = {
            x: -26.4579,
            y: -9.517,
            z: -23.3428
        },
        barrelStageRightPosition = {
            x: -38.6957,
            y: -9.6874,
            z: -23.3843
        },
        barrelBackRightPosition = {
            x: -37.1513,
            y: -6.5585,
            z: -9.9410
        },
        barrelBackLeftPosition = {
            x: -22.6895,
            y: -6.7763,
            z: -14.6075
        },
        allEntities = [],
        entityNames = [];

    // Procedural Functions
    function deleteIfExists() {
        var deleteNames = Settings.getValue(DJ_NAME + "_EFFECTS");
        var SEARCH_RADIUS = 100;
        if (deleteNames) {
            deleteNames.forEach(function (name) {
                var found = Entities.findEntitiesByName(name, avatarPosition, SEARCH_RADIUS);
                try {
                    if (found[0]) {
                        Entities.deleteEntity(found[0]);
                    }
                } catch (e) {
                    log(LOG_ERROR, "DELETING ENTITY", e);
                }
            });
        }
    }

    function createGeneratorDebugCubeEntity(name, position, dimensions, color, userData, parentID) {
        name = name || 1;
        dimensions = dimensions || vec(1, 1, 1);
        color = color || makeColor(1, 1, 1);
        userData = userData || {};
        var properties = {
            name: name,
            type: "Box",
            position: position,
            locked: false,
            script: generatorDebugCubeScript + "?v=" + Date.now(),
            dimensions: dimensions,
            color: color,
            visible: true,
            collisionless: true,
            parentID: parentID,
            userData: userData
        };
        var id = Entities.addEntity(properties);
        return id;
    }

    function createSensorBoxEntity(name, position, dimensions, rotation, color, userData, parentID) {
        name = name || 1;
        dimensions = dimensions || vec(1, 1, 1);
        color = color || makeColor(1, 1, 1);
        userData = userData || {};
        var properties = {
            name: name,
            type: "Box",
            position: position,
            locked: false,
            script: sensorBoxClientScript + "?v=" + Date.now(),
            dimensions: dimensions,
            rotation: rotation,
            color: color,
            visible: false,
            collisionless: true,
            parentID: parentID,
            userData: userData
        };
        var id = Entities.addEntity(properties);
        return id;
    }

    function createDispatchZoneEntity(name, position, dimensions, userData, parentID) {
        name = name || 1;
        dimensions = dimensions || vec(1, 1, 1);
        userData = userData || {};
        var properties = {
            name: name,
            type: "Zone",
            position: position,
            locked: false,
            script: dispatchZoneClientScript + "?v=" + Date.now(),
            serverScripts: dispatchZoneServerScript + "?v=" + Date.now(),
            dimensions: dimensions,
            collisionless: true,
            parentID: parentID,
            userData: userData
        };
        var id = Entities.addEntity(properties);
        return id;
    }

    function createSensorModelEntity(name, position, dimensions, rotation, url, userData, parentID) {
        name = name || "";
        dimensions = dimensions || vec(1, 1, 1);
        userData = userData || {};
        var properties = {
            name: name,
            type: "Model",
            modelURL: url,
            position: position,
            rotation: rotation,
            locked: false,
            dimensions: dimensions,
            collisionless: true,
            parentID: parentID,
            userData: userData
        };
        var id = Entities.addEntity(properties);
        return id;
    }

    function createParticleEntity(name, position, userData, parentID) {
        name = name || "";
        userData = userData || {};
        var properties = {
            name: name,
            locked: false,
            position: position,
            serverScripts: endPointParticleServerScript + "?v=" + Date.now(),
            parentID: parentID,
            userData: userData
        };
        var finalParticleProps = Object.assign({}, particleBaseProps, properties);
        var id = Entities.addEntity(finalParticleProps);
        return id;
    }

    function createSoundEntity(name, position, dimensions, userData, parentID) {
        name = name || "";
        userData = userData || {};
        var properties = {
            name: name,
            type: "Zone",
            locked: false,
            position: position,
            dimensions: dimensions,
            serverScripts: endPointSoundServerScript + "?v=" + Date.now(),
            collisionless: true,
            parentID: parentID,
            userData: userData
        };
        var id = Entities.addEntity(properties);
        return id;
    } 

    function createLightEntity(name, position, dimensions, rotation, color, isSpot, userData, parentID) {
        name = name || "";
        userData = userData || {};
        var properties = {
            name: name,
            position: position,
            dimensions: dimensions,
            rotation: rotation,
            color: color,     
            locked: false,
            isSpotlight: isSpot,
            serverScripts: endPointLightServerScript + "?v=" + Date.now(),
            parentID: parentID,
            userData: userData
        };
        var finalLightProps = Object.assign({}, lightBaseProps, properties);
        var id = Entities.addEntity(finalLightProps);
        return id;
    }

    function createGeneratorDebugCubes() {
        var name,
            entityID,
            debugPosition,
            stringified,       
            userData = {},
            HEIGHT = 0.0,
            DISTANCE_BACK = -0.9,
            DEBUG_WIDTH = 0.05,
            DEBUG_HEIGHT = 0.05,
            DEBUG_DEPTH = 0.05;
        
        debugPosition = Vec3.sum(
            djTableProps[1].position, 
            vec(0, HEIGHT, DISTANCE_BACK)
        );

        name = "Set_" + DJ_NAME + "_Debug-Cube";
        userData.grabbableKey = { grabbable: true };   
        userData.performance = { type: GENERATOR };
        stringified = JSON.stringify(userData);
        entityID = createGeneratorDebugCubeEntity(
            name,             
            debugPosition, 
            vec(DEBUG_WIDTH, DEBUG_HEIGHT, DEBUG_DEPTH),
            makeColor(255,70,0),
            stringified,
            dispatchZoneID
        );
        allEntities.push(entityID);
        entityNames.push(name);
    }

    function createEndPointParticles() {
        [LEFT, RIGHT].forEach(function (side) {
            var name,
                name2,
                entityID,
                entityID2,
                localOffset,
                worldOffset,
                particlePosition,
                particlePosition2,
                stringified,
                userData = {},
                DISTANCE_LEFT = -1,
                DISTANCE_DEPTH = -1,
                HEIGHT = 1;

            userData.performance = {
                type: ENDPOINT
            };

            if (side === LEFT) {
                localOffset = vec(DISTANCE_LEFT, 0, DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                particlePosition = Vec3.sum(
                    avatarPosition,
                    worldOffset
                );
                localOffset = vec(DISTANCE_LEFT, 0, -DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                particlePosition2 = Vec3.sum(
                    avatarPosition,
                    worldOffset
                );
                userData.performance.endPointGroupID = GROUP_LEFT;
            } else {
                localOffset = vec(-DISTANCE_LEFT, 0, DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                particlePosition = Vec3.sum(
                    avatarPosition,
                    worldOffset
                );
                localOffset = vec(-DISTANCE_LEFT, 0, -DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                particlePosition2 = Vec3.sum(
                    avatarPosition,
                    worldOffset
                );
                userData.performance.endPointGroupID = GROUP_RIGHT;
            }

            name = "Set_" + DJ_NAME + "_Particles_" + side;
            name2 = "Set_" + DJ_NAME + "_Particles_Back_" + side;
            userData.grabbableKey = { grabbable: false };
            userData.performance.DEBUG = DEBUG;
            stringified = JSON.stringify(userData);
            entityID = createParticleEntity(name, particlePosition, stringified, dispatchZoneID);
            entityID2 = createParticleEntity(name2, particlePosition2, stringified, dispatchZoneID);
            allEntities.push(entityID, entityID2);
            entityNames.push(name, name2);
        });
    }

    function createEndPointSounds() {
        [LEFT, RIGHT].forEach(function (side) {
            var name,
                name2,
                entityID,
                entityID2,
                localOffset,
                worldOffset,
                DISTANCE_LEFT = -1,
                DISTANCE_DEPTH = -1,
                soundPosition,
                soundPosition2,
                stringified,
                userData = {},
                ZONE_SIZE = 1,
                HEIGHT = 1;

            userData.performance = {
                type: ENDPOINT,
                shortSoundURL: shortSoundURL,
                longSoundURL: longSoundURL
            };

            if (side === LEFT) {
                localOffset = vec(DISTANCE_LEFT, 0, DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                soundPosition = Vec3.sum(
                    avatarPosition, 
                    worldOffset
                );
                localOffset = vec(DISTANCE_LEFT, 0, -DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                soundPosition2 = Vec3.sum(
                    avatarPosition, 
                    worldOffset
                );
                userData.performance.endPointGroupID = GROUP_LEFT;
            } else {
                localOffset = vec(-DISTANCE_LEFT, 0, DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                soundPosition = Vec3.sum(
                    avatarPosition, 
                    worldOffset
                );
                localOffset = vec(-DISTANCE_LEFT, 0, -DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                soundPosition2 = Vec3.sum(
                    avatarPosition, 
                    worldOffset
                );
                userData.performance.endPointGroupID = GROUP_RIGHT;
            }

            name = "Set_" + DJ_NAME + "_Sounds_" + side;
            name2 = "Set_" + DJ_NAME + "_Sounds_Back_" + side;
            userData.grabbableKey = { grabbable: false };
            userData.performance.DEBUG = DEBUG;
            stringified = JSON.stringify(userData);
            entityID = createSoundEntity(name, soundPosition, vec(ZONE_SIZE, ZONE_SIZE, ZONE_SIZE), stringified, dispatchZoneID);
            entityID2 = createSoundEntity(name2, soundPosition2, vec(ZONE_SIZE, ZONE_SIZE, ZONE_SIZE), stringified, dispatchZoneID);
            allEntities.push(entityID, entityID2);
            entityNames.push(name, name2);
        });
    }
    
    function createEndPointLights() {
        [LEFT, RIGHT].forEach(function (side) {
            var name,
                name2,
                entityID,
                entityID2,                
                lightPosition,
                lightPosition2,                
                DIMENSION_SIZE = 30,
                localOffset,
                worldOffset,
                DISTANCE_LEFT = -1,
                DISTANCE_DEPTH = -1,
                lightDimensions = vec(DIMENSION_SIZE, DIMENSION_SIZE, DIMENSION_SIZE),
                lightRotation = Quat.fromPitchYawRollDegrees(0,0,0),
                color = makeColor(70, 90, 100),
                isSpot = false,
                stringified,
                userData = {},
                HEIGHT = 1;

            userData.performance = {
                type: ENDPOINT
            };

            if (side === LEFT) {
                localOffset = vec(DISTANCE_LEFT, 0, DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                lightPosition = Vec3.sum(
                    avatarPosition, 
                    worldOffset
                );
                localOffset = vec(DISTANCE_LEFT, 0, -DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                lightPosition2 = Vec3.sum(
                    avatarPosition, 
                    worldOffset
                );
                userData.performance.endPointGroupID = GROUP_LEFT;
            } else {
                localOffset = vec(-DISTANCE_LEFT, 0, DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                lightPosition = Vec3.sum(
                    avatarPosition, 
                    worldOffset
                );
                localOffset = vec(-DISTANCE_LEFT, 0, -DISTANCE_DEPTH);
                worldOffset = Vec3.multiplyQbyV(avatarOrientation, localOffset);
                lightPosition2 = Vec3.sum(
                    avatarPosition, 
                    worldOffset
                );
                userData.performance.endPointGroupID = GROUP_RIGHT;
            }

            name = "Set_" + DJ_NAME + "_Lights_Stage_" + side;
            name2 = "Set_" + DJ_NAME + "_Lights_Back_" + side;            
            userData.grabbableKey = { grabbable: false };
            userData.performance.DEBUG = DEBUG;
            stringified = JSON.stringify(userData);
            entityID = createLightEntity(
                name, 
                lightPosition, 
                lightDimensions,
                lightRotation,
                color,
                isSpot,
                stringified,
                dispatchZoneID
            );
            entityID2 = createLightEntity(
                name2, 
                lightPosition2, 
                lightDimensions,
                lightRotation,
                color,
                isSpot,
                stringified,
                dispatchZoneID
            );
            allEntities.push(entityID, entityID2);
            entityNames.push(name, name2);

        });
    }

    function createSensorBoxes() {
        [LEFT, RIGHT].forEach(function (side) {
            var name,
                entityID,
                boxPosition,
                color,
                stringified,
                userData = {},
                BOX_WIDTH = 0.4,
                BOX_HEIGHT = 0.4,
                BOX_DEPTH = 0.4,
                HEIGHT = 0,
                DISTANCE_LEFT = 0.52,
                DISTANCE_HEIGHT = BOX_HEIGHT / 2,
                DISTANCE_BACK = -0.5,
                NORMAL = 0,
                REVERSE = 1;

            userData.performance = {
                type: SENSOR
            };

            if (side === LEFT) {
                boxPosition = Vec3.sum(
                    inFrontOfAvatar, 
                    Vec3.multiplyQbyV(MyAvatar.orientation, vec(-DISTANCE_LEFT, DISTANCE_HEIGHT, DISTANCE_BACK))
                );
                color = makeColor(20, 200, 0);
                userData.performance.directionArray = [NORMAL, NORMAL, NORMAL];
                userData.performance.endPointGroups = [GROUP_LEFT];
            } else {
                boxPosition = Vec3.sum(
                    inFrontOfAvatar,
                    Vec3.multiplyQbyV(MyAvatar.orientation, vec(DISTANCE_LEFT, DISTANCE_HEIGHT, DISTANCE_BACK))
                    // vec(-DISTANCE_LEFT, DISTANCE_HEIGHT, DISTANCE_BACK)
                );
                color = makeColor(200, 20, 0);
                userData.performance.directionArray = [REVERSE, NORMAL, NORMAL];
                userData.performance.endPointGroups = [GROUP_RIGHT];
            }
            userData.performance.DEBUG = DEBUG;
            // userData.performance.generatorAccepts = [];
            userData.performance.generatorAccepts = [LEFT_HAND, RIGHT_HAND];
            if (DEBUG) {
                userData.performance.generatorAccepts.push(DEBUG_CUBE);
            }

            userData.grabbableKey = { grabbable: false };
            stringified = JSON.stringify(userData);
            name = "Set_" + DJ_NAME + "_Pad_" + side;
            entityID = createSensorBoxEntity(
                name,                 
                boxPosition, 
                vec(BOX_WIDTH, BOX_HEIGHT, BOX_DEPTH), 
                MyAvatar.orientation,
                color, 
                stringified,
                dispatchZoneID
            );
            allEntities.push(entityID);
            entityNames.push(name);

        });
    }

    function createSensorBoxModels() {
        [LEFT, RIGHT].forEach(function (side) {
            var name,
                entityID,
                modelPosition,
                rotation,
                url,
                stringified,
                userData = {},                
                DISTANCE_LEFT = 0.52,
                HEIGHT = 0,
                DISTANCE_BACK = -0.5,
                MODEL_WIDTH = 0.4,
                MODEL_HEIGHT = 0.05,
                MODEL_DEPTH = 0.4;

            if (side === LEFT) {
                modelPosition = Vec3.sum(
                    inFrontOfAvatar, 
                    Vec3.multiplyQbyV(MyAvatar.orientation, vec(-DISTANCE_LEFT, HEIGHT, DISTANCE_BACK))
                );
                url = particlePadLeftModel;
            } else {
                modelPosition = Vec3.sum(
                    inFrontOfAvatar, 
                    Vec3.multiplyQbyV(MyAvatar.orientation, vec(DISTANCE_LEFT, HEIGHT, DISTANCE_BACK))
                );
                url = particlePadRightModel;
            }
            
            name = "Set_" + DJ_NAME + "_Pad_Models_" + side;
            // rotation = Quat.fromPitchYawRollDegrees(0, 180, 0);
            userData.grabbableKey = { grabbable: false };
            userData.performance = { DEBUG: DEBUG };
            stringified = JSON.stringify(userData);
            entityID = createSensorModelEntity(
                name,                 
                modelPosition,
                vec(MODEL_WIDTH, MODEL_HEIGHT, MODEL_DEPTH), 
                MyAvatar.orientation,                
                url,
                stringified,
                dispatchZoneID
            );
            allEntities.push(entityID);
            entityNames.push(name);
        });
    }

    function createDispatchZones() {
        var name,
            entityID,
            zonePosition,
            stringified,       
            userData = {},
            HEIGHT = 0.0,
            DISTANCE_BACK = -0.9,
            ZONE_WIDTH = 2,
            ZONE_HEIGHT = 2,
            ZONE_DEPTH = 1.3;

        zonePosition = Vec3.sum(
            inFrontOfAvatar, 
            vec(0, HEIGHT, DISTANCE_BACK)
        );

        name = "Set_" + DJ_NAME + "_Dispatch_Zone";
        userData.grabbableKey = { grabbable: false };
        userData.performance = { 
            DEBUG: DEBUG,
            childNamesUpdated: false
        };
        stringified = JSON.stringify(userData);
        entityID = createDispatchZoneEntity(
            name,             
            zonePosition, 
            vec(ZONE_WIDTH, ZONE_HEIGHT, ZONE_DEPTH), 
            stringified
        );
        allEntities.push(entityID);
        entityNames.push(name);
        dispatchZoneID = entityID;
    }

    function updateDispatchZoneChildNames() {
        var namesToUpdate = entityNames.filter(function(name) {
            return name.indexOf("_Dispatch_Zone") === -1;
        });

        var dispatchZoneUserData = getUserData(dispatchZoneID);
        dispatchZoneUserData.performance.childNames = namesToUpdate;
        dispatchZoneUserData.performance.childNamesUpdated = true;
        updateUserData(dispatchZoneID, dispatchZoneUserData);
    }

    // Main
    deleteIfExists();

    createDispatchZones();

    Script.setTimeout(function() {
        if (DEBUG) {
            createGeneratorDebugCubes();
        }
        createSensorBoxes();
        createSensorBoxModels();
        createEndPointParticles();
        createEndPointLights();
        createEndPointSounds();
        updateDispatchZoneChildNames();

    }, CREATE_TIMEOUT);


    Settings.setValue(DJ_NAME + "_EFFECTS", entityNames);

    // Cleanup
    function scriptEnding() {
        allEntities.forEach(function (entities) {
            Entities.deleteEntity(entities);
        });
    }

    Script.scriptEnding.connect(scriptEnding);
}());
