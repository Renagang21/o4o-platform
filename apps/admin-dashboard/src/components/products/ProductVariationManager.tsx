import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  ColorLens as ColorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
// import { ChromePicker } from 'react-color';

interface ProductAttribute {
  id?: string;
  name: string;
  type: 'select' | 'color' | 'button' | 'image';
  values: AttributeValue[];
}

interface AttributeValue {
  id?: string;
  value: string;
  colorCode?: string;
  imageUrl?: string;
  displayOrder?: number;
}

interface ProductVariation {
  id?: string;
  sku: string;
  attributes: { [key: string]: { name: string; value: string } };
  price: number;
  compareAtPrice?: number;
  stock: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  imageUrl?: string;
  isActive: boolean;
  lowStockAlert?: number;
}

interface ProductVariationManagerProps {
  productId: string;
  productName: string;
  basePrice: number;
  onSave?: (variations: ProductVariation[]) => void;
}

export const ProductVariationManager: React.FC<ProductVariationManagerProps> = ({
  productId,
  // productName,
  // basePrice,
  onSave
}) => {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
  // const [variationDialogOpen, setVariationDialogOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null);
  // const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null);
  
  // Form states
  const [attributeForm, setAttributeForm] = useState<ProductAttribute>({
    name: '',
    type: 'select',
    values: []
  });
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Load existing data
  useEffect(() => {
    loadVariationData();
  }, [productId]);

  const loadVariationData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load attributes
      const attrResponse = await fetch(`/api/v1/products/${productId}/attributes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (attrResponse.ok) {
        const attrData = await attrResponse.json();
        setAttributes(attrData.data || []);
      }

      // Load variations
      const varResponse = await fetch(`/api/v1/products/${productId}/variations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (varResponse.ok) {
        const varData = await varResponse.json();
        setVariations(varData.data || []);
      }
    } catch (err: any) {
      setError('Failed to load variation data');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate all possible variations
  const generateVariations = async () => {
    if (attributes.length === 0) {
      setError('Please add attributes first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/products/${productId}/variations/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ attributes })
      });

      if (!response.ok) {
        throw new Error('Failed to generate variations');
      }

      const data = await response.json();
      setVariations(data.data);
      setSuccess(`Generated ${data.data.length} variations`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save attribute
  const saveAttribute = async () => {
    if (!attributeForm.name || attributeForm.values.length === 0) {
      setError('Attribute name and at least one value are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const method = editingAttribute ? 'PUT' : 'POST';
      const url = editingAttribute 
        ? `/api/v1/products/${productId}/attributes/${editingAttribute.id}`
        : `/api/v1/products/${productId}/attributes`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(attributeForm)
      });

      if (!response.ok) {
        throw new Error('Failed to save attribute');
      }

      await loadVariationData();
      setAttributeDialogOpen(false);
      setEditingAttribute(null);
      setAttributeForm({ name: '', type: 'select', values: [] });
      setSuccess('Attribute saved successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add attribute value
  const addAttributeValue = () => {
    if (!newAttributeValue.trim()) return;

    const newValue: AttributeValue = {
      value: newAttributeValue,
      displayOrder: attributeForm.values.length
    };

    if (attributeForm.type === 'color') {
      newValue.colorCode = selectedColor;
    }

    setAttributeForm({
      ...attributeForm,
      values: [...attributeForm.values, newValue]
    });
    setNewAttributeValue('');
  };

  // Remove attribute value
  const removeAttributeValue = (index: number) => {
    setAttributeForm({
      ...attributeForm,
      values: attributeForm.values.filter((_, i) => i !== index)
    });
  };

  // Delete attribute
  const deleteAttribute = async (attrId: string) => {
    if (!window.confirm('Delete this attribute? This will affect all variations.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/products/${productId}/attributes/${attrId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete attribute');
      }

      await loadVariationData();
      setSuccess('Attribute deleted successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save all variations
  const saveAllVariations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/products/${productId}/variations/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ variations })
      });

      if (!response.ok) {
        throw new Error('Failed to save variations');
      }

      setSuccess('All variations saved successfully');
      
      if (onSave) {
        onSave(variations);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update variation field
  const updateVariation = (index: number, field: string, value: any) => {
    const updated = [...variations];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setVariations(updated);
  };

  // Get stock status
  const getStockStatus = (stock: number, lowStockAlert?: number) => {
    if (stock === 0) {
      return { color: 'error' as const, text: 'Out of Stock', icon: <WarningIcon fontSize="small" /> };
    }
    if (lowStockAlert && stock <= lowStockAlert) {
      return { color: 'warning' as const, text: 'Low Stock', icon: <WarningIcon fontSize="small" /> };
    }
    return { color: 'success' as const, text: 'In Stock', icon: <CheckCircleIcon fontSize="small" /> };
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Attributes Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Product Attributes</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="body2" color="textSecondary">
                Define attributes like Size, Color, Material for your product variations
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingAttribute(null);
                  setAttributeForm({ name: '', type: 'select', values: [] });
                  setAttributeDialogOpen(true);
                }}
              >
                Add Attribute
              </Button>
            </Box>

            <Grid container spacing={2}>
              {attributes.map((attr) => (
                <Grid size={{ xs: 12, md: 6 }} key={attr.id}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {attr.name}
                      </Typography>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingAttribute(attr);
                            setAttributeForm(attr);
                            setAttributeDialogOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteAttribute(attr.id!)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {attr.values.map((val, idx) => (
                        <Chip
                          key={idx}
                          label={val.value}
                          size="small"
                          icon={attr.type === 'color' ? (
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: val.colorCode || '#000',
                                border: '1px solid #ccc'
                              }}
                            />
                          ) : undefined}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {attributes.length > 0 && (
              <Box mt={3} textAlign="center">
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={generateVariations}
                  disabled={loading}
                >
                  Generate Variations
                </Button>
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Variations Section */}
      {variations.length > 0 && (
        <Accordion defaultExpanded sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              Product Variations ({variations.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Attributes</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {variations.map((variation, index) => {
                    const stockStatus = getStockStatus(variation.stock, variation.lowStockAlert);
                    
                    return (
                      <TableRow key={variation.id || index}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={variation.sku}
                            onChange={(e) => updateVariation(index, 'sku', e.target.value)}
                            variant="standard"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            {Object.entries(variation.attributes).map(([key, val]) => (
                              <Chip
                                key={key}
                                label={`${val.name}: ${val.value}`}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={variation.price}
                            onChange={(e) => updateVariation(index, 'price', parseFloat(e.target.value))}
                            variant="standard"
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₩</InputAdornment>
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={variation.stock}
                            onChange={(e) => updateVariation(index, 'stock', parseInt(e.target.value))}
                            variant="standard"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={stockStatus.text}
                            color={stockStatus.color}
                            size="small"
                            icon={stockStatus.icon}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={variation.isActive}
                            onChange={(e) => updateVariation(index, 'isActive', e.target.checked)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={loadVariationData}
              >
                Reset Changes
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveAllVariations}
                disabled={loading}
              >
                Save All Variations
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Attribute Dialog */}
      <Dialog
        open={attributeDialogOpen}
        onClose={() => setAttributeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingAttribute ? 'Edit Attribute' : 'Add New Attribute'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Attribute Name"
              value={attributeForm.name}
              onChange={(e) => setAttributeForm({ ...attributeForm, name: e.target.value })}
              fullWidth
              placeholder="e.g., Size, Color, Material"
            />

            <FormControl fullWidth>
              <InputLabel>Display Type</InputLabel>
              <Select
                value={attributeForm.type}
                onChange={(e) => setAttributeForm({ ...attributeForm, type: e.target.value as any })}
                label="Display Type"
              >
                <MenuItem value="select">Dropdown Select</MenuItem>
                <MenuItem value="button">Button Group</MenuItem>
                <MenuItem value="color">Color Swatches</MenuItem>
                <MenuItem value="image">Image Tiles</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Attribute Values
              </Typography>
              
              <Box display="flex" gap={1} mb={2}>
                <TextField
                  size="small"
                  value={newAttributeValue}
                  onChange={(e) => setNewAttributeValue(e.target.value)}
                  placeholder="Enter value"
                  fullWidth
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addAttributeValue();
                    }
                  }}
                />
                
                {attributeForm.type === 'color' && (
                  <Box position="relative">
                    <Button
                      variant="outlined"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      sx={{
                        backgroundColor: selectedColor,
                        '&:hover': {
                          backgroundColor: selectedColor
                        }
                      }}
                    >
                      <ColorIcon />
                    </Button>
                    {showColorPicker && (
                      <Box position="absolute" zIndex={2} top={40}>
                        <Box
                          position="fixed"
                          top={0}
                          right={0}
                          bottom={0}
                          left={0}
                          onClick={() => setShowColorPicker(false)}
                        />
                        {/* <ChromePicker
                          color={selectedColor}
                          onChange={(color: any) => setSelectedColor(color.hex)}
                        /> */}
                        <input
                          type="color"
                          value={selectedColor}
                          onChange={(e) => setSelectedColor(e.target.value)}
                        />
                      </Box>
                    )}
                  </Box>
                )}
                
                <Button
                  variant="contained"
                  onClick={addAttributeValue}
                  disabled={!newAttributeValue.trim()}
                >
                  Add
                </Button>
              </Box>

              <Box display="flex" gap={1} flexWrap="wrap">
                {attributeForm.values.map((val, idx) => (
                  <Chip
                    key={idx}
                    label={val.value}
                    onDelete={() => removeAttributeValue(idx)}
                    icon={attributeForm.type === 'color' ? (
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: val.colorCode || '#000',
                          border: '1px solid #ccc'
                        }}
                      />
                    ) : undefined}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttributeDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveAttribute}
            disabled={loading || !attributeForm.name || attributeForm.values.length === 0}
          >
            {editingAttribute ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};