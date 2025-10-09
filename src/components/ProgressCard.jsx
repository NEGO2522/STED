import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ProgressCard = ({ to, title, description, progress, icon }) => {
  return (
    <Link to={to} className="w-full">
      <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-center space-x-4">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <span className="text-sm font-medium text-indigo-600">{progress}%</span>
          </div>
          <p className="text-sm text-gray-500 mb-2">{description}</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProgressCard;
