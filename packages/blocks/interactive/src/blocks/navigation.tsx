import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

const Edit: React.FC<any> = ({ attributes }) => {
  return (
    <nav className="wp-block-navigation">
      <ul className="wp-block-navigation__container">
        <li className="wp-block-navigation-item">
          <a href="#">Home</a>
        </li>
        <li className="wp-block-navigation-item">
          <a href="#">About</a>
        </li>
        <li className="wp-block-navigation-item">
          <a href="#">Services</a>
        </li>
        <li className="wp-block-navigation-item">
          <a href="#">Contact</a>
        </li>
      </ul>
    </nav>
  );
};

const Save: React.FC<any> = () => {
  return (
    <nav className="wp-block-navigation">
      <ul className="wp-block-navigation__container" />
    </nav>
  );
};

const NavigationBlock: BlockDefinition = {
  name: 'o4o/navigation',
  title: 'Navigation',
  category: 'interactive',
  icon: 'menu',
  description: 'Add a navigation menu.',
  keywords: ['navigation', 'menu', 'nav'],
  
  attributes: {},
  
  supports: {
    align: ['wide', 'full'],
    anchor: true,
    className: true
  },
  
  edit: Edit,
  save: Save
};

export default NavigationBlock;