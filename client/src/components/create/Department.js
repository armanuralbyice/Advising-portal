import React, { useEffect, useState } from 'react';
import MetaData from "../layout/MetaData";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import Pagination from "@mui/material/Pagination";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import axios from "axios";
import { toast } from "react-toastify";
import {useNavigate} from "react-router-dom";

const Department = ({ isSidebarClosed }) => {
    const navigate = useNavigate()
    const [department, setDepartment] = useState({
        name: ''
    })
    const [departments, setDepartments] = useState([])
    const handleDepartmentSubmit = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
      try{
          axios
              .post('http://localhost:4000/department/save', department, {
                  headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                  }
              })
              .then((res) => {
                  if (res.status === 201) {
                      setDepartment({
                          name: '',
                      });
                      fetchDepartments()
                      toast.success(res.data.message);
                  }
              })
              .catch((err) => {
                  if (err.response && err.response.status === 409) {
                      toast.warning(err.response.data.message);
                      console.log(err);
                  } else {
                      toast.error('Internal Server Error');
                  }
              });
      }catch (err){
          toast.error('Internal Server Error');
      }
    };

    const fetchDepartments = () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            axios.get('http://localhost:4000/department/all', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
                .then((res) => {
                    setDepartments(res.data.department);
                })
                .catch((err) => {
                    console.error('Error fetching departments:', err);
                    if (err.response) {
                        console.log(err.response.data);
                        if (err.response.status === 401) {
                            console.error('Unauthorized. Please log in again.');
                            navigate('/login');
                        } else if (err.response.status === 404) {
                            toast.warning('Departments not found.');
                        } else {
                            toast.error('Internal Server Error.');
                        }
                    } else {
                        toast.error('Network Error. Please try again later.');
                    }
                });
        } catch (error) {
            console.error('Error fetching departments:', error);
            toast.error('An unexpected error occurred.');
        }
    };
    useEffect(() => {
        fetchDepartments();
    }, []);
    const handleDelete = async (id) => {
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:4000/department/delete/${id}`,{
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            setDepartments(departments.filter(department => department._id !== id));
            toast.success('Department deleted successfully');
        } catch (error) {
            console.error('Error deleting semester:', error);
            toast.error('An error occurred while deleting Department');
        }
    };
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value);
        setPage(1);
    };
    const indexOfLastItem = page * rowsPerPage;
    const indexOfFirstItem = indexOfLastItem - rowsPerPage;
    const displayedDepartments = departments ? departments.slice(indexOfFirstItem, indexOfLastItem) : [];
    return (
        <div className={`home-section ${isSidebarClosed ? 'sidebar-close' : ''}`}>
            <MetaData title={'Create Department'} />
            <div className="home-content">
                <div className='title'>
                    <h2>Create Department</h2>
                </div>
                <div className="createContainer">
                    <div className='create'>
                        <form onSubmit={handleDepartmentSubmit}>
                            <div className="fields">
                                <div className="input-field">
                                    <label>Department Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter the department name"
                                        name="name"
                                        value={department.name}
                                        onChange={(e) => setDepartment({ ...department, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className='btn'>
                                <button className="button">Submit</button>
                            </div>
                        </form>
                    </div>
                    <div className='tableBox'>
                        <h2>Department</h2>
                        <div className='table'>
                            <table className="fl-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Create At</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedDepartments && displayedDepartments.length > 0 ? (
                                        displayedDepartments.map((department, index) => (
                                            <tr key={index}>
                                                <td>{department.name}</td>
                                                <td>{new Date(department.createAt).toDateString()}</td>
                                                <td onClick={() => handleDelete(department._id)}><FontAwesomeIcon
                                                    icon={faTrash} /></td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4">No department found!</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className='pagination-box'>
                            <div>
                                <Pagination
                                    color="primary"
                                    // count={semesters ? Math.ceil(semesters.length / rowsPerPage) : 0}
                                    page={page}
                                    onChange={handleChangePage}
                                    rowsPerPage={rowsPerPage}
                                    onChangeRowsPerPage={handleChangeRowsPerPage}
                                />
                            </div>
                            <div style={{ 'marginLeft': '20px' }}>
                                <FormControl>
                                    <InputLabel htmlFor="rowsPerPage">Rows Per Page</InputLabel>
                                    <Select className='formControl'
                                        value={rowsPerPage}
                                        label="Rows Per Page"
                                        onChange={handleChangeRowsPerPage}
                                        inputProps={{
                                            name: 'rowsPerPage',
                                            id: 'rowsPerPage',
                                        }}
                                    >
                                        <MenuItem value={rowsPerPage}>10</MenuItem>
                                        <MenuItem value={20}>20</MenuItem>
                                        <MenuItem value={30}>30</MenuItem>
                                        <MenuItem value={40}>40</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Department;