import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Alert,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  Tooltip,
  Badge,
  InputAdornment,
  Collapse,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Palette as ColorIcon,
  Straighten as SizeIcon,
  Category as CategoryIcon,
  AutoAwesome as AutoGenerateIcon,
  Inventory as InventoryIcon,
  AttachMoney as PriceIcon,
  Image as ImageIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as DuplicateIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

interface ProductAttribute {
  id?: string;
  name: string;
  slug: string;
  type: 'select' | 'color' | 'button' | 'image';
  values: AttributeValue[];
  variation: boolean;
  visible: boolean;
  position: number;
}

interface AttributeValue {
  id?: string;
  value: string;
  slug: string;
  label?: string;
  colorCode?: string;
  imageUrl?: string;
  metadata?: {
    priceAdjustment?: number;
    stockAdjustment?: number;
  };
  position: number;
}

interface ProductVariation {
  id?: string;
  sku: string;
  attributes: Record<string, any>;
  attributeString: string;
  retailPrice: number;
  salePrice?: number;
  stockQuantity: number;
  stockStatus: string;
  imageUrl?: string;
  enabled: boolean;
  status: string;
}

interface ProductVariationManagerProps {
  productId: string;
  productSku: string;
  basePrice: number;
  onUpdate?: () => void;
}

export const ProductVariationManager: React.FC<ProductVariationManagerProps> = ({
  productId,
  productSku,
  basePrice,
  onUpdate
}) => {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  
  // Dialog states
  const [attributeDialog, setAttributeDialog] = useState(false);
  const [variationDialog, setVariationDialog] = useState(false);
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  
  // Form states
  const [currentAttribute, setCurrentAttribute] = useState<ProductAttribute>({
    name: '',
    slug: '',
    type: 'select',
    values: [],
    variation: true,
    visible: true,
    position: 0
  });
  
  const [currentVariation, setCurrentVariation] = useState<ProductVariation | null>(null);
  const [expandedAttribute, setExpandedAttribute] = useState<string | null>(null);

  useEffect(() => {
    fetchAttributes();
    fetchVariations();
  }, [productId]);

  const fetchAttributes = async () => {
    try {
      const response = await fetch(`/api/v1/products/${productId}/attributes`);
      const data = await response.json();
      if (data.success) {
        setAttributes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch attributes:', error);
    }
  };

  const fetchVariations = async () => {
    try {
      const response = await fetch(`/api/v1/products/${productId}/variations`);
      const data = await response.json();
      if (data.success) {
        setVariations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch variations:', error);
    }
  };

  const handleAddAttribute = () => {
    setCurrentAttribute({
      name: '',
      slug: '',
      type: 'select',
      values: [],
      variation: true,
      visible: true,
      position: attributes.length
    });
    setAttributeDialog(true);
  };

  const handleSaveAttribute = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/products/${productId}/attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(currentAttribute)
      });

      const data = await response.json();
      if (data.success) {
        fetchAttributes();
        setAttributeDialog(false);
      }
    } catch (error) {
      console.error('Failed to save attribute:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttributeValue = () => {
    const newValue: AttributeValue = {
      value: '',
      slug: '',
      position: currentAttribute.values.length
    };
    
    setCurrentAttribute({
      ...currentAttribute,
      values: [...currentAttribute.values, newValue]
    });
  };

  const handleAttributeValueChange = (index: number, field: string, value: any) => {
    const updatedValues = [...currentAttribute.values];
    updatedValues[index] = {
      ...updatedValues[index],
      [field]: value,
      slug: field === 'value' ? value.toLowerCase().replace(/\s+/g, '-') : updatedValues[index].slug
    };
    
    setCurrentAttribute({
      ...currentAttribute,
      values: updatedValues
    });
  };

  const handleGenerateVariations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/products/${productId}/variations/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          stockDefault: 0,
          priceAdjustments: {}
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchVariations();
      }
    } catch (error) {
      console.error('Failed to generate variations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEdit = async (field: string, value: any) => {
    // Implement bulk edit logic
    console.log('Bulk edit:', field, value, selectedVariations);
  };

  const handleVariationToggle = async (variationId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/v1/variations/${variationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        fetchVariations();
      }
    } catch (error) {
      console.error('Failed to toggle variation:', error);
    }
  };

  const renderAttributesTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">상품 속성</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddAttribute}
        >
          속성 추가
        </Button>
      </Box>

      {attributes.length === 0 ? (
        <Alert severity="info">
          아직 정의된 속성이 없습니다. 속성을 추가하여 상품 변형을 만들어보세요.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {attributes.map((attr) => (
            <Grid item xs={12} key={attr.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={2}>
                      {attr.type === 'color' && <ColorIcon color="primary" />}
                      {attr.type === 'select' && <CategoryIcon color="primary" />}
                      {attr.type === 'image' && <ImageIcon color="primary" />}
                      
                      <Typography variant="subtitle1" fontWeight="bold">
                        {attr.name}
                      </Typography>
                      
                      <Chip 
                        label={attr.variation ? '변형용' : '일반'} 
                        size="small"
                        color={attr.variation ? 'primary' : 'default'}
                      />
                      
                      <Chip 
                        label={`${attr.values.length}개 값`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Box>
                      <IconButton
                        onClick={() => setExpandedAttribute(
                          expandedAttribute === attr.id ? null : attr.id
                        )}
                      >
                        {expandedAttribute === attr.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <IconButton>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Collapse in={expandedAttribute === attr.id}>
                    <Box mt={2}>
                      <Grid container spacing={1}>
                        {attr.values.map((value) => (
                          <Grid item key={value.id}>
                            {attr.type === 'color' ? (
                              <Tooltip title={value.value}>
                                <Box
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    backgroundColor: value.colorCode || '#ccc',
                                    border: '2px solid #ddd',
                                    borderRadius: 1,
                                    cursor: 'pointer'
                                  }}
                                />
                              </Tooltip>
                            ) : (
                              <Chip
                                label={value.value}
                                variant="outlined"
                                onDelete={() => {}}
                              />
                            )}
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderVariationsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">상품 변형 ({variations.length}개)</Typography>
        <Box display="flex" gap={1}>
          {selectedVariations.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setBulkEditDialog(true)}
            >
              일괄 편집 ({selectedVariations.length})
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AutoGenerateIcon />}
            onClick={handleGenerateVariations}
            disabled={attributes.filter(a => a.variation).length === 0}
          >
            자동 생성
          </Button>
        </Box>
      </Box>

      {variations.length === 0 ? (
        <Alert severity="info">
          아직 생성된 변형이 없습니다. 속성을 정의한 후 자동 생성 버튼을 클릭하세요.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedVariations.length === variations.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedVariations(variations.map(v => v.id!));
                      } else {
                        setSelectedVariations([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>이미지</TableCell>
                <TableCell>변형</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="right">가격</TableCell>
                <TableCell align="right">할인가</TableCell>
                <TableCell align="center">재고</TableCell>
                <TableCell align="center">상태</TableCell>
                <TableCell align="center">활성화</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {variations.map((variation) => (
                <TableRow key={variation.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedVariations.includes(variation.id!)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVariations([...selectedVariations, variation.id!]);
                        } else {
                          setSelectedVariations(selectedVariations.filter(id => id !== variation.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {variation.imageUrl ? (
                      <img 
                        src={variation.imageUrl} 
                        alt={variation.attributeString}
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                      />
                    ) : (
                      <Box 
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          backgroundColor: '#f0f0f0',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <ImageIcon sx={{ color: '#999' }} />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {variation.attributeString}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {variation.sku}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    ₩{variation.retailPrice.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {variation.salePrice ? (
                      <Typography color="error">
                        ₩{variation.salePrice.toLocaleString()}
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Badge 
                      badgeContent={variation.stockQuantity} 
                      color={variation.stockQuantity > 0 ? 'success' : 'error'}
                      max={999}
                    >
                      <InventoryIcon fontSize="small" />
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={variation.stockStatus === 'in_stock' ? '재고있음' : '품절'}
                      size="small"
                      color={variation.stockStatus === 'in_stock' ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={variation.enabled}
                      onChange={(e) => handleVariationToggle(variation.id!, e.target.checked)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small">
                      <DuplicateIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            상품 변형 관리
          </Typography>
          
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="속성 설정" icon={<CategoryIcon />} iconPosition="start" />
            <Tab label="변형 관리" icon={<InventoryIcon />} iconPosition="start" />
            <Tab label="가격 설정" icon={<PriceIcon />} iconPosition="start" />
          </Tabs>
          
          <Box mt={3}>
            {activeTab === 0 && renderAttributesTab()}
            {activeTab === 1 && renderVariationsTab()}
            {activeTab === 2 && <div>가격 설정 탭 (구현 예정)</div>}
          </Box>
        </CardContent>
      </Card>

      {/* 속성 추가/편집 Dialog */}
      <Dialog 
        open={attributeDialog} 
        onClose={() => setAttributeDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentAttribute.id ? '속성 편집' : '새 속성 추가'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                label="속성 이름"
                fullWidth
                value={currentAttribute.name}
                onChange={(e) => setCurrentAttribute({
                  ...currentAttribute,
                  name: e.target.value,
                  slug: e.target.value.toLowerCase().replace(/\s+/g, '-')
                })}
                placeholder="예: Color, Size"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>속성 타입</InputLabel>
                <Select
                  value={currentAttribute.type}
                  onChange={(e) => setCurrentAttribute({
                    ...currentAttribute,
                    type: e.target.value as any
                  })}
                  label="속성 타입"
                >
                  <MenuItem value="select">선택 목록</MenuItem>
                  <MenuItem value="color">색상 선택</MenuItem>
                  <MenuItem value="button">버튼</MenuItem>
                  <MenuItem value="image">이미지</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={currentAttribute.variation}
                    onChange={(e) => setCurrentAttribute({
                      ...currentAttribute,
                      variation: e.target.checked
                    })}
                  />
                }
                label="이 속성을 변형 생성에 사용"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1">속성 값</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddAttributeValue}
                >
                  값 추가
                </Button>
              </Box>
              
              {currentAttribute.values.map((value, index) => (
                <Box key={index} display="flex" gap={1} mb={1}>
                  <TextField
                    size="small"
                    placeholder="값"
                    value={value.value}
                    onChange={(e) => handleAttributeValueChange(index, 'value', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  {currentAttribute.type === 'color' && (
                    <TextField
                      size="small"
                      placeholder="#000000"
                      value={value.colorCode}
                      onChange={(e) => handleAttributeValueChange(index, 'colorCode', e.target.value)}
                      sx={{ width: 120 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                backgroundColor: value.colorCode || '#ccc',
                                border: '1px solid #ddd',
                                borderRadius: 0.5
                              }}
                            />
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      const updatedValues = currentAttribute.values.filter((_, i) => i !== index);
                      setCurrentAttribute({
                        ...currentAttribute,
                        values: updatedValues
                      });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttributeDialog(false)}>취소</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveAttribute}
            disabled={!currentAttribute.name || currentAttribute.values.length === 0}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};