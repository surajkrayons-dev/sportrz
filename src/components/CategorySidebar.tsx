// components/CategorySidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

export default function CategorySidebar({ activeCategory }: { activeCategory?: string }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories', { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load categories.');
        const categoriesList = await response.json() as string[];
        setCategories(categoriesList);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return <div className="w-64 bg-white dark:bg-gray-800 h-screen animate-pulse"></div>;
  }

  return (
    <Sidebar 
      categories={categories} 
      onCategoryClick={() => {}}
      activeCategoryId={activeCategory}
    />
  );
}