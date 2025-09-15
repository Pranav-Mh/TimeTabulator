import React from 'react';

const Table = ({ data, onView }) => (
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Time</th>
        <th>Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {data.map((row, index) => (
        <tr key={index}>
          <td>{row.name}</td>
          <td>{row.time}</td>
          <td>{row.date}</td>
          <td>
            <button className="view-btn" onClick={() => onView(row)}>
              View
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default Table;
