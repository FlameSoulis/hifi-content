/*  globals MyAvatar, Entities  */
(function(){
    var APP_NAME = "Stress Test";
    var APP_URL = Script.resolvePath("app.html");
    var TIMEOUT = 30;
    var ENTITY_SPREAD = 10;
    
    var entityProperties = {
        name: "StressTestEntity",
        type: "Model",
        clientOnly: 0,
        parentID: "{00000000-0000-0000-0000-000000000001}",
        owningAvatarID: "{00000000-0000-0000-0000-000000000000}",
        visible: true,
        collidesWith: "",
        modelURL: "https://hifi-content.s3.amazonaws.com/jimi/avatar/photo-real/Clothes/Accessories/Beanie.fbx",
        userData: "{\"Attachment\":{\"action\":\"attach\",\"joint\":\"HeadTop_End\",\"attached\":false,\"options\":{\"translation\":{\"x\":0,\"y\":0,\"z\":0},\"scale\":1}},"
         + "\"grabbableKey\":{\"cloneable\":false,\"grabbable\":true},\"marketplaceID\":\"47b6ff9a-4f34-45a2-a7b1-9059876212e5\"}",        
        serverScripts: "https://hifi-content.s3.amazonaws.com/liv/avatar_shopping_demo/wearableServer.js",
        locked:true
    };

    var tablet = Tablet.getTablet('com.highfidelity.interface.tablet.system');
    var button = tablet.addButton({
        text: APP_NAME
    });

    function clicked(){
        tablet.gotoWebScreen(APP_URL);
    }
    button.clicked.connect(clicked);

    function onWebEventReceived(event){
        print(JSON.stringify(event));
        if (typeof(event) === "string") {
            event = JSON.parse(event);
        }
        if (event.type === "spawn") {
            for (var i = 0; i < ENTITY_SPREAD; i++) {
                for (var j = 0; j < ENTITY_SPREAD; j++) {
                    var position = { x: MyAvatar.position.x + 1, y: MyAvatar.position.y + 1, z: MyAvatar.position.z + j};
                    entityProperties.position = position;
                    Entities.addEntity(entityProperties);
                }
            }
        }
        if (event.type === "cleanup") {
            var foundEntities = Entities.findEntitiesByType("model", MyAvatar.position, 500);
            foundEntities.foreach(function(entity) {
                var name = Entities.getEntityProperties(entity, 'name').name;
                if (name === "StressTestEntity") {
                    Entities.editEntity(entity, {locked: false});
                    Script.setTimeout(function(){
                        Entities.deleteEntity(entity);
                    }, TIMEOUT);
                }
            });
        }
    }

    tablet.webEventReceived.connect(onWebEventReceived);
    function cleanup(){
        tablet.removeButton(button);
    }

    Script.scriptEnding.connect(cleanup);
}());