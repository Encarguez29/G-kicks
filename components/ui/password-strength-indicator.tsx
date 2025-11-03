'use client';

import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  {
    label: '8+ characters',
    test: (password: string) => password.length >= 8
  },
  {
    label: 'Uppercase letter (A)',
    test: (password: string) => /[A-Z]/.test(password)
  },
  {
    label: 'Lowercase letter (a)',
    test: (password: string) => /[a-z]/.test(password)
  },
  {
    label: 'Special character (!@#$%^&*)',
    test: (password: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }
];

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = ''
}) => {
  const getRequirementStatus = (requirement: PasswordRequirement) => {
    return requirement.test(password);
  };

  const getRequirementColor = (isMet: boolean) => {
    return isMet ? 'text-green-400' : 'text-gray-400';
  };

  const getRequirementIcon = (isMet: boolean) => {
    return isMet ? '✓' : '•';
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-600 ${className}`}>
      <div className="space-y-2">
        {passwordRequirements.map((requirement, index) => {
          const isMet = getRequirementStatus(requirement);
          return (
            <div
              key={index}
              className={`flex items-center space-x-2 text-sm ${getRequirementColor(isMet)}`}
            >
              <span className="font-mono text-xs w-3 text-center">
                {getRequirementIcon(isMet)}
              </span>
              <span>{requirement.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;