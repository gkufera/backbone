'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ElementWithCountResponse } from '../lib/api';

interface ElementListProps {
  elements: ElementWithCountResponse[];
  onArchive: (elementId: string) => void;
  productionId?: string;
  scriptId?: string;
  activeElementId?: string | null;
  onElementClick?: (elementId: string) => void;
}

export function ElementList({
  elements,
  onArchive,
  productionId,
  scriptId,
  activeElementId,
  onElementClick,
}: ElementListProps) {
  const [viewMode, setViewMode] = useState<'type' | 'appearance'>('type');
  const [activeDepartmentFilter, setActiveDepartmentFilter] = useState<string | null>(null);
  const [textFilter, setTextFilter] = useState('');

  // Collect unique departments from elements
  const departments = useMemo(() => {
    const deptMap = new Map<string, { id: string; name: string; color: string | null }>();
    for (const elem of elements) {
      if (elem.department) {
        deptMap.set(elem.department.id, elem.department);
      }
    }
    return Array.from(deptMap.values());
  }, [elements]);

  // Filter elements by department and text
  const filteredElements = useMemo(() => {
    let result = elements;
    if (activeDepartmentFilter) {
      result = result.filter((e) => e.department?.id === activeDepartmentFilter);
    }
    if (textFilter.trim()) {
      const lower = textFilter.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(lower));
    }
    return result;
  }, [elements, activeDepartmentFilter, textFilter]);

  // Sort by appearance
  const sortedByAppearance = useMemo(() => {
    return [...filteredElements].sort((a, b) => {
      const pageA = a.highlightPage ?? Infinity;
      const pageB = b.highlightPage ?? Infinity;
      if (pageA !== pageB) return pageA - pageB;
      return a.name.localeCompare(b.name);
    });
  }, [filteredElements]);

  // Group by type
  const characters = filteredElements.filter((e) => e.type === 'CHARACTER');
  const locations = filteredElements.filter((e) => e.type === 'LOCATION');
  const other = filteredElements.filter((e) => e.type !== 'CHARACTER' && e.type !== 'LOCATION');

  return (
    <div className="space-y-4">
      {/* Text filter */}
      <input
        type="text"
        placeholder="Filter elements..."
        value={textFilter}
        onChange={(e) => setTextFilter(e.target.value)}
        className="w-full border-2 border-black p-2 text-sm mb-3"
      />

      {/* Department filter chips */}
      {departments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveDepartmentFilter(null)}
            className={`flex items-center gap-1 border-2 border-black px-2 py-0.5 text-xs ${
              !activeDepartmentFilter ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            All
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() =>
                setActiveDepartmentFilter(
                  activeDepartmentFilter === dept.id ? null : dept.id,
                )
              }
              className={`flex items-center gap-1 border-2 border-black px-2 py-0.5 text-xs ${
                activeDepartmentFilter === dept.id ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              {dept.color && (
                <span
                  className="inline-block h-3 w-3 border border-black"
                  style={{ backgroundColor: dept.color }}
                />
              )}
              {dept.name}
            </button>
          ))}
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('type')}
          className={`px-3 py-1 text-sm ${
            viewMode === 'type' ? 'bg-black text-white' : 'bg-white text-black border-2 border-black'
          }`}
        >
          By Type
        </button>
        <button
          onClick={() => setViewMode('appearance')}
          className={`px-3 py-1 text-sm ${
            viewMode === 'appearance' ? 'bg-black text-white' : 'bg-white text-black border-2 border-black'
          }`}
        >
          By Appearance
        </button>
      </div>

      {viewMode === 'type' ? (
        <div className="space-y-6">
          {characters.length > 0 && (
            <ElementGroup
              title="Characters"
              elements={characters}
              onArchive={onArchive}
              productionId={productionId}
              scriptId={scriptId}
              activeElementId={activeElementId}
              onElementClick={onElementClick}
            />
          )}
          {locations.length > 0 && (
            <ElementGroup
              title="Locations"
              elements={locations}
              onArchive={onArchive}
              productionId={productionId}
              scriptId={scriptId}
              activeElementId={activeElementId}
              onElementClick={onElementClick}
            />
          )}
          {other.length > 0 && (
            <ElementGroup
              title="Other"
              elements={other}
              onArchive={onArchive}
              productionId={productionId}
              scriptId={scriptId}
              activeElementId={activeElementId}
              onElementClick={onElementClick}
            />
          )}
        </div>
      ) : (
        <div>
          <ul className="divide-y divide-black" aria-label="Elements sorted by appearance">
            {sortedByAppearance.map((elem) => (
              <ElementRow
                key={elem.id}
                elem={elem}
                isActive={activeElementId === elem.id}
                onArchive={onArchive}
                productionId={productionId}
                scriptId={scriptId}
                onElementClick={onElementClick}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ElementGroup({
  title,
  elements,
  onArchive,
  productionId,
  scriptId,
  activeElementId,
  onElementClick,
}: {
  title: string;
  elements: ElementWithCountResponse[];
  onArchive: (id: string) => void;
  productionId?: string;
  scriptId?: string;
  activeElementId?: string | null;
  onElementClick?: (elementId: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-lg">{title}</h3>
      <ul className="divide-y divide-black" aria-label={title}>
        {elements.map((elem) => (
          <ElementRow
            key={elem.id}
            elem={elem}
            isActive={activeElementId === elem.id}
            onArchive={onArchive}
            productionId={productionId}
            scriptId={scriptId}
            onElementClick={onElementClick}
          />
        ))}
      </ul>
    </div>
  );
}

function ElementRow({
  elem,
  isActive,
  onArchive,
  productionId,
  scriptId,
  onElementClick,
}: {
  elem: ElementWithCountResponse;
  isActive: boolean;
  onArchive: (id: string) => void;
  productionId?: string;
  scriptId?: string;
  onElementClick?: (elementId: string) => void;
}) {
  const deptColor = elem.department?.color;
  const tempClass = elem.approvalTemperature
    ? `temp-${elem.approvalTemperature}`
    : null;

  return (
    <li
      data-element-id={elem.id}
      className={`flex items-center justify-between py-2 ${
        onElementClick ? 'cursor-pointer' : ''
      } ${isActive ? 'bg-black text-white' : ''}`}
      style={deptColor ? { borderLeft: `4px solid ${deptColor}`, paddingLeft: '8px' } : undefined}
      onClick={() => onElementClick?.(elem.id)}
    >
      <div className="flex items-center gap-2">
        {tempClass && (
          <span className={`inline-block w-2 h-2 ${tempClass}`} aria-hidden="true">●</span>
        )}
        {productionId && scriptId ? (
          <Link
            href={`/productions/${productionId}/scripts/${scriptId}/elements/${elem.id}`}
            className={`font-medium font-mono underline ${isActive ? '' : 'text-black'}`}
          >
            {elem.name}
          </Link>
        ) : (
          <span className="font-medium font-mono">{elem.name}</span>
        )}
        {elem.highlightPage != null && (
          <span className={`ml-2 text-xs font-mono ${isActive ? '' : 'text-black'}`}>
            p. {elem.highlightPage}
          </span>
        )}
        {elem._count?.options != null && (
          <span className={`ml-2 text-xs font-mono ${isActive ? '' : 'text-black'}`}>
            {elem._count.options} {elem._count.options === 1 ? 'option' : 'options'}
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onArchive(elem.id);
        }}
        className={`btn-text text-xs ${
          isActive
            ? 'text-white hover:bg-white hover:text-black'
            : 'text-black hover:bg-black hover:text-white'
        }`}
        aria-label={`Archive ${elem.name}`}
      >
        Archive
      </button>
    </li>
  );
}
