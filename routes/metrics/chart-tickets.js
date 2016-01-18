import angular from 'angular'
import d3 from 'd3'
import moment from 'moment'
import { chain, flatten, forEach, keys, map, values } from 'lodash'
import css from './chart-tickets.css'

export default angular.module('wafflejs.routes.metrics.chart-tickets', [
  require('models/calendar').default
])
.directive('chartTickets', () => {
  const margin = { top: 0, right: 60.5, bottom: 30.5, left: 40.5 }

  return {
    restrict: 'EA',
    scope: { tickets: '=' },
    bindToController: true,
    controllerAs: 'chartTickets',
    controller: class {
      constructor($element) {
        const svg = d3.select($element[0]).append('svg')

        const chart = svg.append('g')
          .classed('chart', true)
          .attr('transform', `translate(${margin.left}, ${margin.top})`)
          .on('mouseout', this.onMouseOut.bind(this))

        const width = parseInt(svg.style('width')) - margin.left - margin.right
        const height = parseInt(svg.style('height')) - margin.top - margin.bottom

        this.byMonth = chain(this.tickets)
          .sortBy('Ticket Created Date')
          .groupBy('date')
          .value()
        var tickets = values(this.byMonth)
        var last = keys(this.byMonth).sort().reverse()[0]

        // x
        forEach(tickets, (tickets) => {
          tickets.last = tickets[0].date === last
          tickets.date = moment(tickets[0].date).endOf('day')
          tickets.x = d3.time.scale()
            .domain([moment(tickets.date).subtract(38, 'days'), tickets.date])
            .range([0, width])
            .clamp(true)
          forEach(tickets, (d, i) => {
            d.x = tickets.x
            d.n = i + 1
          })
        })
        var x = tickets[0][0].x
        var xAxis = d3.svg.axis()
          .scale(x)
          .tickFormat(d => Math.round(moment.duration(d - x.domain()[1]).asDays()))
        chart.append('g')
          .classed('x axis', true)
          .attr('transform', `translate(0, ${height})`)
          .call(xAxis)

        // y
        var y = d3.scale.linear()
          .domain([0, d3.max(map(tickets, 'length'))])
          .range([height, 0])
          .nice()

        var yAxis = d3.svg.axis()
          .scale(y)
          .orient('left')
          .ticks(4)
        chart.append('g')
          .classed('y axis', true)
          .call(yAxis)

        // line
        var line = d3.svg.line()
          .x(d => d.x(d['Ticket Created Date']))
          .y(d => y(d.n))
        var opacity = d3.scale.linear()
          .domain([tickets[0].date, tickets[tickets.length-1].date])
          .range([0.5, 1])

        this.lines = chart.selectAll('path.line').data(tickets)
        this.lines
          .enter().append('path')
            .classed('line', true)
            .attr('opacity', d => opacity(d.date))
            .attr('d', line)

        // label
        chart.selectAll('text.label').data(tickets)
          .enter().append('text')
            .classed('label', true)
            .attr('dx', '3px')
            .attr('dy', '.35em')
            .attr('opacity', d => opacity(d.date))
            .attr('transform', (d) => {
              const last = Math.min(moment(d[d.length-1]['Ticket Created Date']), d.date)
              return `translate(${d.x(last)}, ${y(d.length)})`
            })
            .text(d => `${d[0]['Event Month']} (${d.length})`)

        // voronoi
        const voronoi = d3.geom.voronoi()
          .x(d => d.x(d['Ticket Created Date']))
          .y(d => y(d.n))
        const voronoiGroup = chart.append('g')
          .classed('voronoi', true)
        voronoiGroup.selectAll('path')
          .data(voronoi(flatten(tickets)))
          .enter().append('path')
            .attr('d', d => `M${d.join('L')}Z`)
            .datum(d => d.point)
            .on('mouseover', this.onMouseOver.bind(this))

        this.onMouseOut()
      }

      onMouseOver(p) {
        this.lines.classed('current', d => d.x === p.x)
      }

      onMouseOut() {
        this.lines.classed('current', d => d.last)
      }
    }
  }
})
.name
