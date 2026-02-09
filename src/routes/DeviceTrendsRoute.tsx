import { useParams, Navigate } from "react-router-dom";
import DeviceTrendsPage from "../pages/TrendPage";

export default function DeviceTrendsRoute(){
    const {deviceId} = useParams<{deviceId:string}>();

    if(!deviceId){
        return<Navigate to="/app" replace/>;
    }
    return <DeviceTrendsPage deviceId={deviceId}/>;
}