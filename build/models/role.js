'use strict';

module.exports = function (Role) {

  //Check whether database exist default user role, if no , create them
  Role.on('attached', function () {
    var createdTime = new Date().getTime();
    var defaultUserRoles = [{ name: "user", description: "People to login in to our apps, who can perform view, play, charge, report issue, etc", created: createdTime }, { name: "teleClawAdmin", description: "Administrators / operaters of TeleClaw, who can access the dashboard and perform admin actions", created: createdTime }];
    defaultUserRoles.map(function (role) {
      Role.find({ where: { name: role.name } }, function (err, data) {
        if (data !== undefined && data.length == 0) {
          Role.create(role);
        }
      });
    });
  });
};