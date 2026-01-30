const RoleBase = require('./RoleBase');
const { Minion, Assassin, Morgana, Mordred, Oberon, EvilMessenger, Lunatic } = require('./impl/EvilRoles');
const { Servant, UntrustworthyServant, Merlin, Percival } = require('./impl/GoodRoles');
const { Cleric, JrMessenger, SrMessenger } = require('./impl/CustomRoles');

class RoleRegistry {
    constructor() {
        this.roles = {};
        this.register(Minion);
        this.register(Assassin);
        this.register(Morgana);
        this.register(Mordred);
        this.register(Oberon);
        this.register(EvilMessenger);
        this.register(Lunatic);

        this.register(Servant);
        this.register(UntrustworthyServant);
        this.register(Merlin);
        this.register(Percival);

        this.register(Cleric);
        this.register(JrMessenger);
        this.register(SrMessenger);
    }

    register(roleClass) {
        // Instantiating just to get the name property for the key
        const instance = new roleClass();
        this.roles[instance.name] = roleClass;
    }

    getRole(roleName) {
        const RoleClass = this.roles[roleName];
        if (!RoleClass) throw new Error(`Role ${roleName} not found`);
        return new RoleClass();
    }

    getAllRoles() {
        return Object.values(this.roles).map(RoleClass => {
            const instance = new RoleClass();
            return { name: instance.name, alignment: instance.alignment };
        });
    }
}

module.exports = new RoleRegistry();
