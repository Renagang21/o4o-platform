/**
 * AI Block Debug Page
 * Shows actual saved block data structure to debug preview issues
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { postApi } from '@/services/api/postApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AIBlockDebug() {
  const [postId, setPostId] = useState('');
  const [postData, setPostData] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [error, setError] = useState('');

  const loadPost = async () => {
    if (!postId.trim()) {
      setError('Post ID is required');
      return;
    }

    try {
      setError('');
      const response = await postApi.get(postId);

      if (!response.success) {
        setError('Failed to load post');
        return;
      }

      const post = response.data as any;
      setPostData(post);

      // Parse content
      const contentData = post.content?.rendered || post.content || '';
      if (contentData) {
        try {
          const parsed = JSON.parse(contentData);
          const extractedBlocks = Array.isArray(parsed) ? parsed :
                                 parsed.blocks ? parsed.blocks :
                                 [parsed];
          setBlocks(extractedBlocks);
        } catch (e) {
          setError('Failed to parse content JSON');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load post');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Block Debug Tool</h1>

      {/* Load Post */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Load Post by ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter Post ID"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              className="flex-1 px-4 py-2 border rounded"
            />
            <Button onClick={loadPost}>Load</Button>
          </div>
          {error && <p className="mt-2 text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {/* Post Info */}
      {postData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Post Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Title:</strong> {postData.title?.rendered || postData.title}</p>
              <p><strong>Status:</strong> {postData.status}</p>
              <p><strong>Blocks Count:</strong> {blocks.length}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocks Data */}
      {blocks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Blocks Data Structure</h2>

          {blocks.map((block, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Block #{index + 1}: {block.type}</span>
                  <span className="text-sm font-normal text-gray-500">
                    ID: {block.id}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Content */}
                <div>
                  <h3 className="font-semibold mb-2">content:</h3>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600 mb-1">Type: {typeof block.content}</p>
                    <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded">
                      {JSON.stringify(block.content, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Attributes */}
                <div>
                  <h3 className="font-semibold mb-2">attributes:</h3>
                  <div className="bg-blue-50 p-3 rounded">
                    {block.attributes && Object.keys(block.attributes).length > 0 ? (
                      <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded">
                        {JSON.stringify(block.attributes, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-gray-500">Empty or undefined</p>
                    )}
                  </div>
                </div>

                {/* Analysis */}
                <div className="border-t pt-3">
                  <h3 className="font-semibold mb-2">Analysis:</h3>
                  <div className="space-y-1 text-sm">
                    {block.type === 'o4o/heading' && (
                      <>
                        <p>✓ attributes.content: {block.attributes?.content ? '✅ EXISTS' : '❌ MISSING'}</p>
                        <p>✓ attributes.level: {block.attributes?.level ? `✅ ${block.attributes.level}` : '❌ MISSING'}</p>
                        <p>✓ content is object: {typeof block.content === 'object' && !Array.isArray(block.content) ? '✅' : '❌'}</p>
                        <p>✓ content is empty: {typeof block.content === 'object' && Object.keys(block.content).length === 0 ? '✅' : '❌'}</p>
                      </>
                    )}
                    {block.type === 'o4o/paragraph' && (
                      <>
                        <p>✓ attributes.content: {block.attributes?.content ? '✅ EXISTS' : '❌ MISSING'}</p>
                        <p>✓ content is object: {typeof block.content === 'object' && !Array.isArray(block.content) ? '✅' : '❌'}</p>
                        <p>✓ content is empty: {typeof block.content === 'object' && Object.keys(block.content).length === 0 ? '✅' : '❌'}</p>
                      </>
                    )}
                    {block.type === 'o4o/list' && (
                      <>
                        <p>✓ attributes.items: {block.attributes?.items ? `✅ ${block.attributes.items.length} items` : '❌ MISSING'}</p>
                        <p>✓ attributes.ordered: {typeof block.attributes?.ordered !== 'undefined' ? `✅ ${block.attributes.ordered}` : '❌ MISSING'}</p>
                        <p>✓ content is object: {typeof block.content === 'object' && !Array.isArray(block.content) ? '✅' : '❌'}</p>
                        <p>✓ content is empty: {typeof block.content === 'object' && Object.keys(block.content).length === 0 ? '✅' : '❌'}</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
