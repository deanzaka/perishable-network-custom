/**
 * Copyright 2017 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
const fs = require('fs');
const Client = require('composer-client');
const Admin = require('composer-admin');
const Common = require('composer-common');
const BusinessNetworkDefinition = Admin.BusinessNetworkDefinition;
const BusinessNetworkConnection = Client.BusinessNetworkConnection;
const AdminConnection = Admin.AdminConnection;
const homedir = require('homedir');
const path = require('path');
let Util = require('../test/util');
const BrowserFS = require('browserfs/dist/node/index');
let factory;
const CONNECTION_PROFILE = 'defaultProfile';

const bfs_fs = BrowserFS.BFSRequire('fs');
const NS = 'org.acme.shipping.perishable';


BrowserFS.initialize(new BrowserFS.FileSystem.InMemory());
const adminConnection = new AdminConnection({ fs: bfs_fs });

let connectionProfileName;
let businessNetworkName;
let businessNetworkConnection;
let businessNetworkDefinition;
let fileWallet;
let store = require('store');
store.clearAll();

let client;

let enrollId;
let enrollSecret;

return adminConnection.createProfile(CONNECTION_PROFILE, {
    type: 'embedded'
})
    .then(() => {
        return adminConnection.connect(CONNECTION_PROFILE, 'admin', 'pas5word');
    })
    .then(() => {
        return BusinessNetworkDefinition.fromDirectory(path.resolve(__dirname, '..'));
    })
    .then((businessNetworkDefinition) => {
        return adminConnection.deploy(businessNetworkDefinition);
    })
    .then(() => {
        businessNetworkConnection = new BusinessNetworkConnection({ fs: bfs_fs });
        return businessNetworkConnection.connect(CONNECTION_PROFILE, 'perishable-network', 'admin', 'pas5word');
    })
    .then(() => {
        factory = businessNetworkConnection.getBusinessNetwork().getFactory();
        //create wallet
        fileWallet = new Common.FileWallet({
            directory: `../wallets/${CONNECTION_PROFILE}`
        });
        //initiate setupDemo
        return Util.setupDemo(businessNetworkConnection);
    })
    .then(() => {
        const participantFQI = NS + '.Grower#grower_banana@email.com';
        const participantID = 'grower_banana';
        //save mapping between FQI and ID to storage
        store.set(participantFQI, participantID );
        //issue identity
        return businessNetworkConnection.issueIdentity(participantFQI, participantID, {issuer: false});
    })
    .then((result) => {
        console.log(result);
        //update to wallet
        return addToWallet(result);
    })
    .then(() => {
        return retrieveCreds(NS + '.Grower#grower_banana@email.com');
    })
    .then((creds) => {
        console.log(creds);
        return businessNetworkConnection.getIdentityRegistry();
    })
    .then((registry) => {
        return registry.getAll();
        //return registry.get('dc49d61f0bd3dcaa114697897d5f5456e95b455a34e7d3eb6e808bf36c9a0010');
    })
    .then((ids) => {
        console.log(ids);
    });


function retrieveCreds(fqi) {
    const userID = store.get(fqi); 
    return fileWallet.get(userID).then((userSecret) => {
        return {userID, userSecret};
    });
}

function addToWallet(creds) {
    if (fileWallet.contains(creds.userID)) {
        return fileWallet.update(creds.userID, creds.userSecret);
    } else {
        return fileWallet.add(creds.userID, creds.userSecret);
    }
}