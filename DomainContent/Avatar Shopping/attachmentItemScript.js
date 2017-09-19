//
//  attachmentItemScript.js
//
//  This script is a simplified version of the original attachmentItemScript.js 
//  Copyright 2017 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var ATTACH_SOUND = SoundCache.getSound(Script.resolvePath('sound/attach_sound_1.wav'));
    var DETACH_SOUND = SoundCache.getSound(Script.resolvePath('sound/detach.wav'));

    var LEFT_RIGHT_PLACEHOLDER = '[LR]';
    var ATTACH_DISTANCE = 0.35;
    var DETACH_DISTANCE = 0.5;

    var _this, _entityID;
    var _attachmentData;
    var _supportedJoints = [];
    var isAttached = false;

    function AttachableItem() {
        _this = this;
    }
    AttachableItem.prototype = {
        preload : function(entityID) {
            print("Loading attachmentItemScript.js");
            _entityID = entityID;
            print("Attachment Entity ID: " + _entityID);
            _attachmentData = JSON.parse(Entities.getEntityProperties(entityID).userData).Attachment;
            print(JSON.stringify(_attachmentData.joint));
            if (_attachmentData.joint.indexOf(LEFT_RIGHT_PLACEHOLDER) !== -1) {
                var baseJoint = _attachmentData.joint.substring(4);
                _supportedJoints.push("Left".concat(baseJoint));
                _supportedJoints.push("Right".concat(baseJoint));
            } else {
                _supportedJoints.push(_attachmentData.joint);
            }
            print(JSON.stringify(_supportedJoints));            
        },
        startNearGrab: function() {
            this.intervalFunc = Script.setInterval(function(){
                var position = Entities.getEntityProperties(_entityID, ['position']).position;
                _supportedJoints.forEach(function(joint) {
                    var jointPosition = MyAvatar.getJointPosition(joint);
                    // TODO: make this less dumb
                    if (! isAttached) {
                        if (Vec3.distance(position, jointPosition) <= ATTACH_DISTANCE) {
                            isAttached = true;
                            Entities.editEntity(_entityID, {
                                parentID: MyAvatar.sessionUUID,
                                parentJointIndex: MyAvatar.getJointIndex(joint)
                            });
                            if (ATTACH_SOUND.downloaded) {
                                Audio.playSound(ATTACH_SOUND, {
                                    position: MyAvatar.position,
                                    volume: 0.2,
                                    localOnly: true
                                });
                            }
                        }
                    } else {
                    // We're attached, need to check to remove
                        if (Vec3.distance(position, jointPosition) >= DETACH_DISTANCE) {
                            isAttached = false;
                            Entities.editEntity(_entityID, {
                                parentID: "{00000000-0000-0000-0000-000000000000}"
                            });
                            if (DETACH_SOUND.downloaded) {
                                Audio.playSound(DETACH_SOUND, {
                                    position: MyAvatar.position,
                                    volume: 0.2,
                                    localOnly: true
                                });
                            }
                        }
                    }
                });
            }, 300);
        },
        releaseGrab: function() {
            // We do not care about attaching/detaching if we are not being held
            print("Releasing grab");
            Script.clearInterval(this.intervalFunc);
        }
    };
    return new AttachableItem(); 
});