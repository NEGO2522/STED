import React from 'react';
import { UserButton, useUser } from "@clerk/clerk-react";

function ProfileIcon() {
  const { user } = useUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'User';

  return (
    <div className="flex items-center space-x-3">
      <span className="text-black font-medium text-sm">
        {fullName}
      </span>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}

export default ProfileIcon;
