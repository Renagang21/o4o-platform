import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
// import { ShoppingCart } from 'lucide-react';
import { Edit } from './edit';
import { save } from './save';
import metadata from './block.json';

registerBlockType(metadata as any, {
  edit: Edit,
  save
});