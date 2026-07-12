import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TrendingUp, BarChart3, Users, Eye } from 'lucide-react';

interface D3AnalyticsProps {
  analyticsData: Array<{
    date: string;
    visitors: number;
    views: number;
  }>;
  newsList: Array<{
    category: string;
    views: number;
  }>;
}

export default function D3Analytics({ analyticsData, newsList }: D3AnalyticsProps) {
  const lineChartRef = useRef<SVGSVGElement | null>(null);
  const barChartRef = useRef<SVGSVGElement | null>(null);

  // Chart 1: Daily Visitor Trends (D3 Line & Area Chart)
  useEffect(() => {
    if (!lineChartRef.current || !analyticsData || analyticsData.length === 0) return;

    // Clean previous content
    d3.select(lineChartRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = d3.select(lineChartRef.current)
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('width', '100%')
      .attr('height', '100%')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const formattedData = analyticsData.map(d => ({
      date: parseDate(d.date) || new Date(),
      visitors: d.visitors,
      views: d.views
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    // X Scale
    const x = d3.scaleTime()
      .domain(d3.extent(formattedData, d => d.date) as [Date, Date])
      .range([0, width]);

    // Y Scale (for views)
    const y = d3.scaleLinear()
      .domain([0, d3.max(formattedData, d => Math.max(d.views, d.visitors)) || 100])
      .nice()
      .range([height, 0]);

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('stroke-width', 0.5)
      .attr('stroke', '#f1f5f9')
      .attr('stroke-dasharray', '3,3')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(() => '')
      );

    // X Axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat('%e %b') as any))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .call(g => g.selectAll('.tick text').attr('fill', '#475569').attr('font-size', '10px').attr('font-weight', 'bold'));

    // Y Axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick text').attr('fill', '#475569').attr('font-size', '10px').attr('font-weight', 'bold'));

    // Area generator for views
    const areaViews = d3.area<any>()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.views))
      .curve(d3.curveMonotoneX);

    // Area generator for visitors
    const areaVisitors = d3.area<any>()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.visitors))
      .curve(d3.curveMonotoneX);

    // Add gradients
    const defs = svg.append('defs');

    const gradViews = defs.append('linearGradient')
      .attr('id', 'views-grad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    gradViews.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.15);
    gradViews.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.0);

    const gradVisitors = defs.append('linearGradient')
      .attr('id', 'visitors-grad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    gradVisitors.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.15);
    gradVisitors.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6').attr('stop-opacity', 0.0);

    // Draw area for views
    svg.append('path')
      .datum(formattedData)
      .attr('fill', 'url(#views-grad)')
      .attr('d', areaViews);

    // Draw area for visitors
    svg.append('path')
      .datum(formattedData)
      .attr('fill', 'url(#visitors-grad)')
      .attr('d', areaVisitors);

    // Line generator for views
    const lineViews = d3.line<any>()
      .x(d => x(d.date))
      .y(d => y(d.views))
      .curve(d3.curveMonotoneX);

    // Line generator for visitors
    const lineVisitors = d3.line<any>()
      .x(d => x(d.date))
      .y(d => y(d.visitors))
      .curve(d3.curveMonotoneX);

    // Draw views line
    svg.append('path')
      .datum(formattedData)
      .attr('fill', 'none')
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 2.5)
      .attr('d', lineViews);

    // Draw visitors line
    svg.append('path')
      .datum(formattedData)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2.5)
      .attr('d', lineVisitors);

    // Interactive circles on points
    formattedData.forEach(d => {
      // Views dots
      svg.append('circle')
        .attr('cx', x(d.date))
        .attr('cy', y(d.views))
        .attr('r', 4)
        .attr('fill', '#ffffff')
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 2)
        .append('title')
        .text(`Views: ${d.views}`);

      // Visitors dots
      svg.append('circle')
        .attr('cx', x(d.date))
        .attr('cy', y(d.visitors))
        .attr('r', 4)
        .attr('fill', '#ffffff')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2)
        .append('title')
        .text(`Visitors: ${d.visitors}`);
    });

  }, [analyticsData]);

  // Chart 2: Category Wise Views (D3 Bar Chart)
  useEffect(() => {
    if (!barChartRef.current) return;

    // Clean previous content
    d3.select(barChartRef.current).selectAll('*').remove();

    // Group views by category
    const categoryViews: Record<string, number> = {
      'राष्ट्रीय': 0,
      'राज्य': 0,
      'शहर': 0,
      'क्रीडा': 0,
      'मनोरंजन': 0,
      'अर्थव्यवस्था': 0,
    };

    if (newsList && newsList.length > 0) {
      newsList.forEach(item => {
        if (item.category && categoryViews[item.category] !== undefined) {
          categoryViews[item.category] += (item.views || 0);
        }
      });
    }

    const data = Object.entries(categoryViews).map(([category, views]) => ({
      category,
      views
    }));

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = d3.select(barChartRef.current)
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('width', '100%')
      .attr('height', '100%')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.category))
      .range([0, width])
      .padding(0.3);

    // Y Scale
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.views) || 100])
      .nice()
      .range([height, 0]);

    // X Axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .call(g => g.select('.domain').attr('stroke', '#cbd5e1'))
      .call(g => g.selectAll('.tick text').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', 'bold'));

    // Y Axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick text').attr('fill', '#475569').attr('font-size', '10px').attr('font-weight', 'bold'));

    // Gradient for Bars
    const defs = svg.append('defs');
    const barGrad = defs.append('linearGradient')
      .attr('id', 'bar-grad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    barGrad.append('stop').attr('offset', '0%').attr('stop-color', '#fb7185');
    barGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e');

    // Draw Bars
    svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.category) || 0)
      .attr('y', height)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', 'url(#bar-grad)')
      .attr('rx', 4)
      .transition()
      .duration(800)
      .attr('y', d => y(d.views))
      .attr('height', d => height - y(d.views));

    // Add text labels on top of bars
    svg.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => (x(d.category) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.views) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', '10px')
      .attr('font-weight', 'extrabold')
      .text(d => d.views.toLocaleString('en-IN'));

  }, [newsList]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Card 1: Daily Visitor Trends */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-50">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-rose-500" />
              <span>दैनिक वाचक आणि भेट कल (D3.js)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold">मागील १० दिवसांचे युनिक व्हिजिटर्स आणि एकूण पेज व्ह्यूज</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span>
              <span className="text-slate-500">युनिक वाचक</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block"></span>
              <span className="text-slate-500">एकूण व्ह्यूज</span>
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg ref={lineChartRef} className="mx-auto block" />
        </div>
      </div>

      {/* Card 2: Most Read Categories */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-50">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <BarChart3 className="h-4.5 w-4.5 text-rose-500" />
              <span>श्रेणीनुसार वाचक संख्या (D3.js)</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold">प्रत्येक बातमी श्रेणीसाठी एकूण जमा झालेली वाचक संख्या</p>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg ref={barChartRef} className="mx-auto block" />
        </div>
      </div>
    </div>
  );
}
