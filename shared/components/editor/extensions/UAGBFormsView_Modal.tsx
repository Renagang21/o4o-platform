      {/* 편집 모달 */}
      {isEditorOpen && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '1200px',
            height: '80%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* 모달 헤더 */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600' }}>
                Edit Form Builder
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            {/* 탭 컨텐츠 */}
            <div style={{ flex: '1', overflow: 'auto' }}>
              <UAGBTabs
                tabs={[
                  {
                    id: 'fields',
                    label: 'Fields',
                    icon: <FileText size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        {/* 필드 관리 */}
                        <UAGBPanel title="Form Fields" isOpen={true}>
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {[
                                { type: 'text', label: 'Text', icon: <Type size={14} /> },
                                { type: 'email', label: 'Email', icon: <Mail size={14} /> },
                                { type: 'tel', label: 'Phone', icon: <Phone size={14} /> },
                                { type: 'textarea', label: 'Textarea', icon: <FileText size={14} /> },
                                { type: 'select', label: 'Select', icon: <Circle size={14} /> },
                                { type: 'radio', label: 'Radio', icon: <Circle size={14} /> },
                                { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={14} /> },
                                { type: 'date', label: 'Date', icon: <Calendar size={14} /> },
                                { type: 'number', label: 'Number', icon: <Hash size={14} /> },
                                { type: 'file', label: 'File', icon: <FileImage size={14} /> }
                              ].map((fieldType) => (
                                <button
                                  key={fieldType.type}
                                  onClick={() => addField(fieldType.type as any)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    background: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                  }}
                                >
                                  {fieldType.icon}
                                  {fieldType.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 선택된 필드 편집 */}
                          {attrs.fields.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Field to Edit:
                              </label>
                              <select
                                value={selectedFieldIndex}
                                onChange={(e) => setSelectedFieldIndex(Number(e.target.value))}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  marginBottom: '16px'
                                }}
                              >
                                {attrs.fields.map((field, index) => (
                                  <option key={field.id} value={index}>
                                    {field.label} ({field.type})
                                  </option>
                                ))}
                              </select>

                              {/* 선택된 필드 상세 설정 */}
                              {attrs.fields[selectedFieldIndex] && (
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                                    Edit Field: {attrs.fields[selectedFieldIndex].label}
                                  </h4>

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <UAGBTextControl
                                      label="Field Label"
                                      value={attrs.fields[selectedFieldIndex].label}
                                      onChange={(label) => updateField(selectedFieldIndex, { label })}
                                    />

                                    <UAGBTextControl
                                      label="Field Name"
                                      value={attrs.fields[selectedFieldIndex].name}
                                      onChange={(name) => updateField(selectedFieldIndex, { name })}
                                    />

                                    <UAGBTextControl
                                      label="Placeholder"
                                      value={attrs.fields[selectedFieldIndex].placeholder}
                                      onChange={(placeholder) => updateField(selectedFieldIndex, { placeholder })}
                                    />

                                    <UAGBSelectControl
                                      label="Field Width"
                                      value={attrs.fields[selectedFieldIndex].width}
                                      options={[
                                        { label: 'Full Width', value: 'full' },
                                        { label: 'Half Width', value: 'half' },
                                        { label: 'One Third', value: 'third' },
                                        { label: 'One Quarter', value: 'quarter' }
                                      ]}
                                      onChange={(width) => updateField(selectedFieldIndex, { width: width as any })}
                                    />
                                  </div>

                                  <div style={{ marginTop: '16px' }}>
                                    <UAGBToggleControl
                                      label="Required Field"
                                      checked={attrs.fields[selectedFieldIndex].required}
                                      onChange={(required) => updateField(selectedFieldIndex, { required })}
                                    />
                                  </div>

                                  {/* 옵션 필드들 (select, radio, checkbox) */}
                                  {['select', 'radio', 'checkbox'].includes(attrs.fields[selectedFieldIndex].type) && (
                                    <div style={{ marginTop: '16px' }}>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Options:
                                      </label>
                                      {attrs.fields[selectedFieldIndex].options.map((option, optIndex) => (
                                        <div key={optIndex} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                          <input
                                            type="text"
                                            value={option.label}
                                            onChange={(e) => {
                                              const newOptions = [...attrs.fields[selectedFieldIndex].options];
                                              newOptions[optIndex].label = e.target.value;
                                              updateField(selectedFieldIndex, { options: newOptions });
                                            }}
                                            placeholder="Option Label"
                                            style={{
                                              flex: 1,
                                              padding: '6px 10px',
                                              border: '1px solid #d1d5db',
                                              borderRadius: '4px'
                                            }}
                                          />
                                          <input
                                            type="text"
                                            value={option.value}
                                            onChange={(e) => {
                                              const newOptions = [...attrs.fields[selectedFieldIndex].options];
                                              newOptions[optIndex].value = e.target.value;
                                              updateField(selectedFieldIndex, { options: newOptions });
                                            }}
                                            placeholder="Option Value"
                                            style={{
                                              flex: 1,
                                              padding: '6px 10px',
                                              border: '1px solid #d1d5db',
                                              borderRadius: '4px'
                                            }}
                                          />
                                          <button
                                            onClick={() => {
                                              const newOptions = attrs.fields[selectedFieldIndex].options.filter((_, i) => i !== optIndex);
                                              updateField(selectedFieldIndex, { options: newOptions });
                                            }}
                                            style={{
                                              padding: '6px 8px',
                                              background: '#ef4444',
                                              color: '#fff',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        onClick={() => {
                                          const newOptions = [
                                            ...attrs.fields[selectedFieldIndex].options,
                                            { label: `Option ${attrs.fields[selectedFieldIndex].options.length + 1}`, value: `option${attrs.fields[selectedFieldIndex].options.length + 1}` }
                                          ];
                                          updateField(selectedFieldIndex, { options: newOptions });
                                        }}
                                        style={{
                                          padding: '6px 12px',
                                          background: '#10b981',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '12px'
                                        }}
                                      >
                                        + Add Option
                                      </button>
                                    </div>
                                  )}

                                  {/* 필드 삭제 버튼 */}
                                  {attrs.fields.length > 1 && (
                                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                                      <button
                                        onClick={() => removeField(selectedFieldIndex)}
                                        style={{
                                          padding: '8px 16px',
                                          background: '#ef4444',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontSize: '14px',
                                          fontWeight: '500'
                                        }}
                                      >
                                        Delete This Field
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </UAGBPanel>
                      </div>
                    )
                  },
                  {
                    id: 'settings',
                    label: 'Settings',
                    icon: <Settings size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPanel title="Form Settings" isOpen={true}>
                          <UAGBTextControl
                            label="Form Name"
                            value={attrs.formName}
                            onChange={(formName) => updateAttributes({ formName })}
                          />

                          <UAGBSelectControl
                            label="Form Layout"
                            value={attrs.formLayout}
                            options={[
                              { label: 'Default', value: 'default' },
                              { label: 'Inline', value: 'inline' },
                              { label: 'Floating Labels', value: 'floating' }
                            ]}
                            onChange={(formLayout) => updateAttributes({ formLayout: formLayout as any })}
                          />

                          <UAGBNumberControl
                            label="Field Spacing"
                            value={attrs.fieldSpacing}
                            min={0}
                            max={50}
                            onChange={(fieldSpacing) => updateAttributes({ fieldSpacing })}
                          />

                          <UAGBToggleControl
                            label="Enable Ajax Submission"
                            checked={attrs.enableAjax}
                            onChange={(enableAjax) => updateAttributes({ enableAjax })}
                          />

                          <UAGBToggleControl
                            label="Enable reCAPTCHA"
                            checked={attrs.enableRecaptcha}
                            onChange={(enableRecaptcha) => updateAttributes({ enableRecaptcha })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Submit Button" isOpen={false}>
                          <UAGBTextControl
                            label="Button Text"
                            value={attrs.submitButtonText}
                            onChange={(submitButtonText) => updateAttributes({ submitButtonText })}
                          />

                          <UAGBSelectControl
                            label="Button Alignment"
                            value={attrs.submitButtonAlign}
                            options={[
                              { label: 'Left', value: 'left' },
                              { label: 'Center', value: 'center' },
                              { label: 'Right', value: 'right' },
                              { label: 'Full Width', value: 'full' }
                            ]}
                            onChange={(submitButtonAlign) => updateAttributes({ submitButtonAlign: submitButtonAlign as any })}
                          />

                          <UAGBColorControl
                            label="Button Background"
                            value={attrs.submitButtonBackgroundColor}
                            onChange={(submitButtonBackgroundColor) => updateAttributes({ submitButtonBackgroundColor })}
                          />

                          <UAGBColorControl
                            label="Button Text Color"
                            value={attrs.submitButtonColor}
                            onChange={(submitButtonColor) => updateAttributes({ submitButtonColor })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Form Submission" isOpen={false}>
                          <UAGBSelectControl
                            label="Submission Method"
                            value={attrs.submission.method}
                            options={[
                              { label: 'Email', value: 'email' },
                              { label: 'Webhook', value: 'webhook' },
                              { label: 'Database', value: 'database' }
                            ]}
                            onChange={(method) => updateAttributes({ 
                              submission: { ...attrs.submission, method: method as any }
                            })}
                          />

                          {attrs.submission.method === 'email' && (
                            <>
                              <UAGBTextControl
                                label="Email To"
                                value={attrs.submission.emailTo}
                                onChange={(emailTo) => updateAttributes({ 
                                  submission: { ...attrs.submission, emailTo }
                                })}
                              />

                              <UAGBTextControl
                                label="Email Subject"
                                value={attrs.submission.emailSubject}
                                onChange={(emailSubject) => updateAttributes({ 
                                  submission: { ...attrs.submission, emailSubject }
                                })}
                              />
                            </>
                          )}

                          <UAGBTextControl
                            label="Success Message"
                            value={attrs.submission.successMessage}
                            onChange={(successMessage) => updateAttributes({ 
                              submission: { ...attrs.submission, successMessage }
                            })}
                          />

                          <UAGBTextControl
                            label="Error Message"
                            value={attrs.submission.errorMessage}
                            onChange={(errorMessage) => updateAttributes({ 
                              submission: { ...attrs.submission, errorMessage }
                            })}
                          />
                        </UAGBPanel>
                      </div>
                    )
                  },
                  {
                    id: 'style',
                    label: 'Style',
                    icon: <Palette size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPanel title="Global Label Styles" isOpen={true}>
                          <UAGBNumberControl
                            label="Label Font Size"
                            value={attrs.globalLabelFontSize}
                            min={8}
                            max={48}
                            onChange={(globalLabelFontSize) => updateAttributes({ globalLabelFontSize })}
                          />

                          <UAGBSelectControl
                            label="Label Font Weight"
                            value={attrs.globalLabelFontWeight}
                            options={[
                              { label: 'Normal', value: '400' },
                              { label: 'Medium', value: '500' },
                              { label: 'Semi Bold', value: '600' },
                              { label: 'Bold', value: '700' }
                            ]}
                            onChange={(globalLabelFontWeight) => updateAttributes({ globalLabelFontWeight: globalLabelFontWeight as string })}
                          />

                          <UAGBColorControl
                            label="Label Color"
                            value={attrs.globalLabelColor}
                            onChange={(globalLabelColor) => updateAttributes({ globalLabelColor })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Global Input Styles" isOpen={false}>
                          <UAGBNumberControl
                            label="Input Font Size"
                            value={attrs.globalInputFontSize}
                            min={8}
                            max={32}
                            onChange={(globalInputFontSize) => updateAttributes({ globalInputFontSize })}
                          />

                          <UAGBColorControl
                            label="Input Background"
                            value={attrs.globalInputBackgroundColor}
                            onChange={(globalInputBackgroundColor) => updateAttributes({ globalInputBackgroundColor })}
                          />

                          <UAGBColorControl
                            label="Input Text Color"
                            value={attrs.globalInputTextColor}
                            onChange={(globalInputTextColor) => updateAttributes({ globalInputTextColor })}
                          />

                          <UAGBColorControl
                            label="Input Border Color"
                            value={attrs.globalInputBorderColor}
                            onChange={(globalInputBorderColor) => updateAttributes({ globalInputBorderColor })}
                          />

                          <UAGBNumberControl
                            label="Input Border Radius"
                            value={attrs.globalInputBorderRadius}
                            min={0}
                            max={20}
                            onChange={(globalInputBorderRadius) => updateAttributes({ globalInputBorderRadius })}
                          />

                          <UAGBNumberControl
                            label="Input Height"
                            value={attrs.globalInputHeight}
                            min={20}
                            max={80}
                            onChange={(globalInputHeight) => updateAttributes({ globalInputHeight })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Form Container" isOpen={false}>
                          <UAGBColorControl
                            label="Form Background"
                            value={attrs.formBackgroundColor}
                            onChange={(formBackgroundColor) => updateAttributes({ formBackgroundColor })}
                          />

                          <UAGBColorControl
                            label="Form Border Color"
                            value={attrs.formBorderColor}
                            onChange={(formBorderColor) => updateAttributes({ formBorderColor })}
                          />

                          <UAGBNumberControl
                            label="Form Border Width"
                            value={attrs.formBorderWidth}
                            min={0}
                            max={10}
                            onChange={(formBorderWidth) => updateAttributes({ formBorderWidth })}
                          />

                          <UAGBNumberControl
                            label="Form Border Radius"
                            value={attrs.formBorderRadius}
                            min={0}
                            max={20}
                            onChange={(formBorderRadius) => updateAttributes({ formBorderRadius })}
                          />
                        </UAGBPanel>
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </div>
        </div>
      )}
