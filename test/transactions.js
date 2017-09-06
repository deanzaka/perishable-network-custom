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
let Util = require('./util');
const BrowserFS = require('browserfs/dist/node/index');
let factory;
const CONNECTION_PROFILE = 'defaultProfile';

require('chai').should();

const chai = require('chai');
chai.should();
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));

const bfs_fs = BrowserFS.BFSRequire('fs');
const NS = 'org.acme.shipping.perishable';

describe('Perishable transactions - Setup Demo', () => {

    let connectionProfileName;
    let businessNetworkName;
    let businessNetworkConnection;
    let businessNetworkDefinition;

    let adminConnection;
    let client;

    let enrollId;
    let enrollSecret;

    before(function () {
        BrowserFS.initialize(new BrowserFS.FileSystem.InMemory());
        const adminConnection = new AdminConnection({ fs: bfs_fs });
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
                return Util.setupDemo(businessNetworkConnection);
            });
    });

    describe('#setupDemo', () => {
        it('should create the correct number of resources in the network', () => {
            return businessNetworkConnection.getParticipantRegistry(NS + '.Grower')
                .then((pr) => {
                    return pr.getAll();
                })
                .then((participants) => {
                    participants.length.should.equal(2);
                    return businessNetworkConnection.getParticipantRegistry(NS + '.Shipper');
                })
                .then((pr) => {
                    return pr.getAll();
                })
                .then((shippers) => {
                    shippers.length.should.equal(2);
                    return businessNetworkConnection.getParticipantRegistry(NS + '.Importer');
                })
                .then((pr) => {
                    return pr.getAll();
                })
                .then((importers) => {
                    importers.length.should.equal(2);
                    return businessNetworkConnection.getAssetRegistry(NS + '.Contract');
                })
                .then((ar) => {
                    return ar.getAll();
                })
                .then((contracts) => {
                    contracts.length.should.equal(2);
                    return businessNetworkConnection.getAssetRegistry(NS + '.Shipment');
                })
                .then((ar) => {
                    return ar.getAll();
                })
                .then((shipments) => {
                    shipments.length.should.equal(2);
                });
        });

        it('should create 2 contracts: 1) Between grower_banana, shipper_evergreen and importer_foodhall 2) Between grower_orange, shipper_hanjin and cold_storage', () => {
            let contracts;
            return businessNetworkConnection.getAssetRegistry(NS + '.Contract')
            .then((ar) => {
                contracts = ar;
                return contracts.get('CON_001');
            })
            .then((con1) => {
                con1.grower.getIdentifier().should.equal('grower_banana@email.com');
                con1.shipper.getIdentifier().should.equal('shipper_evergreen@email.com');
                con1.importer.getIdentifier().should.equal('importer_foodhall@email.com');
                return contracts.get('CON_002');
            })
            .then((con2) => {
                con2.grower.getIdentifier().should.equal('grower_orange@email.com');
                con2.shipper.getIdentifier().should.equal('shipper_hanjin@email.com');
                con2.importer.getIdentifier().should.equal('importer_cold_storage@email.com');
            });
        });
    });

});